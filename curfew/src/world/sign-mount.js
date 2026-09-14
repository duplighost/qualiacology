// A sign's authored point is its painted front. All timber and support metal
// extends behind that plane, regardless of its world orientation.
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
