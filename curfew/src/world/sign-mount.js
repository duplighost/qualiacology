// A sign's authored point is its painted front. All timber and support metal
// extends behind that plane, regardless of its world orientation.
import * as THREE from 'three';

export function mountSignBoard(kit, face, emit = () => {}) {
  const {x,y,z,yaw=0,w,h,groundY,depth=.06,postWidth=.08,postSpacing=0,
    boardColor=[.105,.077,.052],postColor=boardColor,tag='wood'}=face;
  const nx=Math.sin(yaw),nz=Math.cos(yaw),ax=Math.cos(yaw),az=-Math.sin(yaw);
  const solid=(width,height,d,cx,cy,cz,color)=>{
    kit.box(width,height,d,cx,cy,cz,color,yaw);
    emit({kind:'obb',x:cx,z:cz,halfX:width/2,halfZ:d/2,yaw,y0:cy-height/2,y1:cy+height/2,tag,authored:true});
  };
  const boardBack=depth+.012,boardCentre=depth/2+.012;
  solid(w+.06,h+.06,depth,x-nx*boardCentre,y,z-nz*boardCentre,boardColor);
  if(groundY===undefined)return;
  const offsets=postSpacing>0?[-postSpacing/2,postSpacing/2]:[0],top=y+h/2;
  for(const across of offsets){
    const back=boardBack+postWidth/2,px=x+ax*across-nx*back,pz=z+az*across-nz*back;
    const floor=typeof groundY==='function'?groundY(px,pz):groundY;
    const height=Math.max(.1,top-floor);
    solid(postWidth,height,postWidth,px,floor+height/2,pz,postColor);
  }
}

// RESEAT A WALL-HUNG FACE. A painted plane hung by an authored number on a wall that has
// since moved is either inside the masonry or floating in front of it. Cast from RESEAT_OUT
// in front of the face straight back along its normal against `meshes` (the owning site's
// resident geometry, world matrices up to date): the first hit inside RESEAT_MAX behind the
// face is the wall, and the face moves to sit `gap` in front of it. A hit IN FRONT of the
// face (something standing over it) is not a wall and is left for the clearance test to
// name. Vertical faces only (rx = 0): a table note lies on its table by construction.
// Returns how far the face moved (signed, +away from the wall) or null when nothing was hit.
const RESEAT_OUT = 0.40, RESEAT_MAX = 0.50;
const _rc = new THREE.Raycaster(), _o = new THREE.Vector3(), _d = new THREE.Vector3();
export function reseatFace(face, meshes, gap = 0.012) {
  if (!face || !meshes || !meshes.length || face.rx) return null;
  const nx = Math.sin(face.yaw || 0), nz = Math.cos(face.yaw || 0);
  _o.set(face.x + nx * RESEAT_OUT, face.y, face.z + nz * RESEAT_OUT);
  _d.set(-nx, 0, -nz);
  _rc.set(_o, _d); _rc.near = 0; _rc.far = RESEAT_OUT + RESEAT_MAX;
  const hits = _rc.intersectObjects(meshes, true);
  let hit = null;
  for (let i = 0; i < hits.length; i++) { if (hits[i].distance >= RESEAT_OUT - 0.02) { hit = hits[i]; break; } }
  if (!hit) return null;
  const want = hit.distance - RESEAT_OUT - gap;      // how far behind the face the wall is, less the gap
  if (Math.abs(want) < 0.004) return 0;
  face.x -= nx * want; face.z -= nz * want;
  return -want;
}
