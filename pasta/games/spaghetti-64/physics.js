// The course uses its original collision triangles at 1/100 of game scale.
// Physics and animation intentionally use different deformation scales: the
// capsule remains playable while the visible noodle bundle folds around it.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const EPS = 1e-6;
const length = (v) => Math.hypot(v.x, v.y, v.z);
const subtract = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a, b) => ({ x: a.y*b.z-a.z*b.y, y:a.z*b.x-a.x*b.z, z:a.x*b.y-a.y*b.x });
const point = (a) => Array.isArray(a) ? {x:a[0],y:a[1],z:a[2]} : {x:a.x,y:a.y,z:a.z};

function inside3(p, t, margin = 0.0003) {
  const v = subtract(p,t.a);
  const d20 = dot(v,t.ab), d21 = dot(v,t.ac);
  const u = (t.ac2*d20-t.abac*d21)*t.invDen;
  const w = (t.ab2*d21-t.abac*d20)*t.invDen;
  return u >= -margin && w >= -margin && u+w <= 1+margin;
}

function walkable(triangle, sourceNonSlipperySlopes=false) {
  const n = triangle.normal.y;
  if(sourceNonSlipperySlopes&&triangle.surface.includes('NOT_SLIPPERY')&&n>.015)return true;
  if (n < 0.31) return false;
  if (triangle.surface.includes('VERY_SLIPPERY')) return n > 0.91;
  if (triangle.surface.includes('NOT_SLIPPERY')) return n > 0.31;
  if (triangle.surface.includes('SLIPPERY')) return n > 0.65;
  return n > 0.48;
}

export class CoursePhysics {
  constructor(course) {
    this.cellSize = 6;
    this.grid = new Map();
    this.triangles = [];
    this.dynamicEnabled = new Map();
    this.dynamicTemplates = new Map();
    this.dynamicLive = new Map();
    this._append(course.vertices || [],course.triangles || [],null);
    for (const item of course.dynamic || []) {
      const kind=item.id||item.kind;
      this.dynamicTemplates.set(kind,item);
      const yaw = (item.yaw || 0)*Math.PI/180;
      const c = Math.cos(yaw), s = Math.sin(yaw), p = item.position || [0,0,0];
      const vertices = item.vertices.map(v=>[p[0]+v[0]*c+v[2]*s,p[1]+v[1],p[2]-v[0]*s+v[2]*c]);
      this._append(vertices,item.triangles,kind);
      this.dynamicEnabled.set(kind,true);
    }
  }

  setCourse(course) {
    // Keep camera and controller references stable when crossing an area warp.
    Object.assign(this,new CoursePhysics(course));
    return this;
  }

  _append(vertices,triangles,dynamic) {
    for (const face of triangles) {
      const a=point(vertices[face[0]]), b=point(vertices[face[1]]), c=point(vertices[face[2]]);
      const ab=subtract(b,a), ac=subtract(c,a), normal=cross(ab,ac), magnitude=length(normal);
      if (magnitude < EPS) continue;
      normal.x/=magnitude;normal.y/=magnitude;normal.z/=magnitude;
      const ab2=dot(ab,ab),ac2=dot(ac,ac),abac=dot(ab,ac);
      const t={a,b,c,ab,ac,normal,ab2,ac2,abac,invDen:1/(ab2*ac2-abac*abac),surface:face[3]||'SURFACE_DEFAULT',force:Number(face[4])||0,dynamic,
        minX:Math.min(a.x,b.x,c.x),maxX:Math.max(a.x,b.x,c.x),
        minY:Math.min(a.y,b.y,c.y),maxY:Math.max(a.y,b.y,c.y),
        minZ:Math.min(a.z,b.z,c.z),maxZ:Math.max(a.z,b.z,c.z)};
      const id=this.triangles.length;
      this.triangles.push(t);
      for(let x=Math.floor(t.minX/this.cellSize);x<=Math.floor(t.maxX/this.cellSize);x++) {
        for(let z=Math.floor(t.minZ/this.cellSize);z<=Math.floor(t.maxZ/this.cellSize);z++) {
          const key=x+','+z;
          if(!this.grid.has(key)) this.grid.set(key,[]);
          this.grid.get(key).push(id);
        }
      }
    }
  }

  _active(t) { return !t.dynamic || (this.dynamicEnabled.get(t.dynamic)!==false && (t.live || !this.dynamicLive.has(t.dynamic))); }
  setDynamicEnabled(kind,enabled) { this.dynamicEnabled.set(kind,!!enabled); }

  _liveFaces(vertices,faces,kind) {
    const result=[];
    for(const face of faces){
      const a=point(vertices[face[0]]),b=point(vertices[face[1]]),c=point(vertices[face[2]]),ab=subtract(b,a),ac=subtract(c,a),normal=cross(ab,ac),magnitude=length(normal);
      if(magnitude<EPS)continue;
      normal.x/=magnitude;normal.y/=magnitude;normal.z/=magnitude;
      const ab2=dot(ab,ab),ac2=dot(ac,ac),abac=dot(ab,ac);
      result.push({a,b,c,ab,ac,normal,ab2,ac2,abac,invDen:1/(ab2*ac2-abac*abac),surface:face[3]||'SURFACE_NOT_SLIPPERY',force:Number(face[4])||0,dynamic:kind,live:true,minX:Math.min(a.x,b.x,c.x),maxX:Math.max(a.x,b.x,c.x),minY:Math.min(a.y,b.y,c.y),maxY:Math.max(a.y,b.y,c.y),minZ:Math.min(a.z,b.z,c.z),maxZ:Math.max(a.z,b.z,c.z)});
    }
    this.dynamicLive.set(kind,result);
  }

  setDynamicPose(kind,position,rotation=[0,0,0]) {
    const item=this.dynamicTemplates.get(kind);if(!item)return false;
    const p=point(position),[rx,ry,rz]=rotation,a=Math.cos(rx),b=Math.sin(rx),c=Math.cos(ry),d=Math.sin(ry),e=Math.cos(rz),f=Math.sin(rz);
    const vertices=item.vertices.map(v=>[p.x+c*e*v[0]-c*f*v[1]+d*v[2],p.y+(a*f+b*e*d)*v[0]+(a*e-b*f*d)*v[1]-b*c*v[2],p.z+(b*f-a*e*d)*v[0]+(b*e+a*f*d)*v[1]+a*c*v[2]]);
    this._liveFaces(vertices,item.triangles,kind);return true;
  }

  setBoxCollider(id,box,enabled=true) {
    this.dynamicEnabled.set(id,!!enabled);if(!enabled){this.dynamicLive.delete(id);return;}
    const p=point(box.center),h=point(box.halfSize),yaw=box.yaw||0,c=Math.cos(yaw),s=Math.sin(yaw);
    const vertices=[[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1],[-1,1,-1],[1,1,-1],[1,1,1],[-1,1,1]].map(v=>{const x=v[0]*h.x,y=v[1]*h.y,z=v[2]*h.z;return[p.x+x*c+z*s,p.y+y,p.z-x*s+z*c];});
    const faces=[[4,7,6],[4,6,5],[0,1,2],[0,2,3],[3,2,6],[3,6,7],[1,0,4],[1,4,5],[2,1,5],[2,5,6],[0,3,7],[0,7,4]];
    this._liveFaces(vertices,faces,id);
  }

  _nearTriangles(minX,maxX,minZ,maxZ) {
    const ids=new Set();
    for(let x=Math.floor(minX/this.cellSize);x<=Math.floor(maxX/this.cellSize);x++)for(let z=Math.floor(minZ/this.cellSize);z<=Math.floor(maxZ/this.cellSize);z++)for(const id of this.grid.get(x+','+z)||[])ids.add(id);
    const result=[...ids].map(i=>this.triangles[i]);
    for(const [kind,triangles]of this.dynamicLive){if(this.dynamicEnabled.get(kind)===false)continue;for(const t of triangles)if(t.maxX>=minX&&t.minX<=maxX&&t.maxZ>=minZ&&t.minZ<=maxZ)result.push(t);}
    return result;
  }

  groundAt(x,z,ceiling=Infinity) {
    const candidates=this._nearTriangles(x,x,z,z);
    let best=null,high=-Infinity;
    for(const t of candidates) {
      const n=t.normal;
      if(!this._active(t)||n.y<0.015||t.minY>ceiling+EPS||x<t.minX-EPS||x>t.maxX+EPS||z<t.minZ-EPS||z>t.maxZ+EPS) continue;
      const height=t.a.y-(n.x*(x-t.a.x)+n.z*(z-t.a.z))/n.y;
      if(height>ceiling+EPS||height<high) continue;
      if(inside3({x,y:height,z},t)) { high=height;best=t; }
    }
    return best ? {height:high,normal:[best.normal.x,best.normal.y,best.normal.z],surface:best.surface,walkable:walkable(best,this.sourceNonSlipperySlopes),triangle:best} : null;
  }

  ceilingAt(x,z,floor=-Infinity) {
    const candidates=this._nearTriangles(x,x,z,z);
    let low=Infinity,best=null;
    for(const t of candidates) {
      const n=t.normal;
      if(!this._active(t)||n.y>-.015||t.maxY<floor||x<t.minX-EPS||x>t.maxX+EPS||z<t.minZ-EPS||z>t.maxZ+EPS) continue;
      const h=t.a.y-(n.x*(x-t.a.x)+n.z*(z-t.a.z))/n.y;
      if(h<floor-EPS||h>low||!inside3({x,y:h,z},t)) continue;
      low=h;best=t;
    }
    return best?{height:low,normal:[best.normal.x,best.normal.y,best.normal.z],triangle:best}:null;
  }

  resolveWalls(position,radius=0.43,height=1.8) {
    const out={x:0,z:0,hit:false};
    for(let iteration=0;iteration<3;iteration++) {
      const candidates=this._nearTriangles(position.x-radius,position.x+radius,position.z-radius,position.z+radius);
      let changed=false;
      for(const t of candidates) {
        const n=t.normal;
        if(this.sourceNonSlipperySlopes&&t.surface.includes('NOT_SLIPPERY')&&n.y>.015)continue;
        if(!this._active(t)||Math.abs(n.y)>0.46||t.maxY<position.y+0.22||t.minY>position.y+height) continue;
        if(position.x<t.minX-radius||position.x>t.maxX+radius||position.z<t.minZ-radius||position.z>t.maxZ+radius) continue;
        const horizontal=Math.hypot(n.x,n.z);
        if(horizontal<EPS) continue;
        for(const offset of [0.28,Math.min(0.9,height*.55),height-0.2]) {
          const sample={x:position.x,y:position.y+offset,z:position.z};
          const d=dot(subtract(sample,t.a),n)/horizontal;
          if(Math.abs(d)>=radius) continue;
          const nx=n.x/horizontal,nz=n.z/horizontal;
          const projected={x:sample.x-nx*d,y:sample.y,z:sample.z-nz*d};
          if(!inside3(projected,t,0.003)) continue;
          const push=(radius-Math.abs(d)+0.0005)*(d>=0?1:-1);
          position.x+=nx*push;position.z+=nz*push;
          out.x+=nx*push;out.z+=nz*push;out.hit=true;changed=true;
        }
      }
      if(!changed) break;
    }
    return out;
  }

  raycastSegment(from,to,radius=0.3) {
    const a=point(from),b=point(to),delta=subtract(b,a),total=length(delta);
    if(total<EPS)return null;
    const candidates=this._nearTriangles(Math.min(a.x,b.x)-radius,Math.max(a.x,b.x)+radius,Math.min(a.z,b.z)-radius,Math.max(a.z,b.z)+radius);
    let nearest=1,found=null;
    for(const t of candidates) {
      if(!this._active(t)||t.surface.includes('NO_CAM_COLLISION'))continue;
      const n=t.normal,denom=dot(delta,n);
      if(Math.abs(denom)<EPS)continue;
      const start=dot(subtract(a,t.a),n),sign=start>=0?1:-1;
      if(start*denom>=0)continue;
      const frac=(sign*radius-start)/denom;
      if(frac<.015||frac>nearest)continue;
      const p={x:a.x+delta.x*frac,y:a.y+delta.y*frac,z:a.z+delta.z*frac};
      const projected={x:p.x-n.x*sign*radius,y:p.y-n.y*sign*radius,z:p.z-n.z*sign*radius};
      if(!inside3(projected,t,.015))continue;
      nearest=frac;found={point:p,normal:[n.x*sign,n.y*sign,n.z*sign],distance:total*frac,fraction:frac};
    }
    return found;
  }
}

export class NoodleController {
  constructor(physics,start) {
    this.physics=physics;this.radius=.43;this.height=1.8;
    this._cookingSoftness=.55;
    this._spawn=start;this.reset(start);
  }

  get cookingSoftness(){return this._cookingSoftness;}
  set cookingSoftness(value){const n=Number(value);this._cookingSoftness=Number.isFinite(n)?clamp(n,0,1):.55;}

  reset(start=this._spawn) {
    this._spawn=start;
    this.position=point(start.position || start);
    this.velocity={x:0,y:0,z:0};
    this.yaw=(start.yawRadians!==undefined)?start.yawRadians:(start.yaw||0)*Math.PI/180;
    this.health=8;this.grounded=false;this.surface='SURFACE_DEFAULT';this.squash=0;this.softness=0;
    this.squashVelocity=0;this.speed=0;this.time=0;this.airTime=0;this.landingTimer=10;
    this.jumpCount=0;this.invincible=0;this.disabled=false;this.dead=false;this.diving=false;
    this.pounding=false;this.slide=0;this.coyote=0;this.jumpBuffer=0;this.events=[];
    this.lastLandingSpeed=0;this.wasMoving=false;this.groundNormal=[0,1,0];
    const floor=this.physics.groundAt(this.position.x,this.position.z,this.position.y+.6);
    if(floor&&Math.abs(this.position.y-floor.height)<.6) {this.position.y=floor.height;this.grounded=true;this.coyote=.12;}
  }

  knockback(dx,dz,damage=1) {
    if(this.invincible>0||this.dead)return false;
    const mag=Math.hypot(dx,dz)||1;
    this.velocity.x=dx/mag*8;this.velocity.z=dz/mag*8;this.velocity.y=6.8;
    this.grounded=false;this.diving=false;this.pounding=false;this.invincible=1.8;
    this.health=Math.max(0,this.health-damage);this.squashVelocity-=5;
    this.events.push('damage');
    if(this.health===0){this.dead=true;this.events.push('death');}
    return true;
  }

  update(dt,input={}) {
    dt=clamp(dt,0,.1);this.events=[];
    const result={landed:false,jumped:false,groundPound:false,landingSpeed:0};
    if(!dt)return result;
    this.time+=dt;this.invincible=Math.max(0,this.invincible-dt);this.landingTimer+=dt;
    if(input.jump&&!this.disabled&&!this.dead)this.jumpBuffer=.14;
    else this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);
    if(input.groundPound&&!this.grounded&&!this.disabled&&!this.dead){this.pounding=true;this.diving=false;this.velocity.y=-16;this.velocity.x*=.18;this.velocity.z*=.18;}
    if(input.dive&&!this.grounded&&!this.disabled&&!this.dead&&!this.pounding){this.diving=true;this.velocity.x+=Math.sin(this.yaw)*3.3;this.velocity.z+=Math.cos(this.yaw)*3.3;this.velocity.y=Math.max(this.velocity.y,2.3);}
    const steps=Math.max(1,Math.ceil(dt/(1/90))),h=dt/steps;
    for(let step=0;step<steps;step++)this._step(h,input,result);
    this.speed=Math.hypot(this.velocity.x,this.velocity.z);
    this.softness+=(clamp(this.speed/12+(this.grounded?0:.12),0,1)-this.softness)*(1-Math.exp(-6*dt));
    // A damped spring makes landing energy available to the strand renderer.
    this.squashVelocity+=(-(145-82*this.cookingSoftness)*this.squash-(17-7*this.cookingSoftness)*this.squashVelocity)*dt;
    this.squash=clamp(this.squash+this.squashVelocity*dt,-.28,.5);
    return result;
  }

  _step(dt,input,result) {
    const p=this.position,v=this.velocity;
    const oldY=p.y,wasGrounded=this.grounded;
    let ix=Number(input.x)||0,iz=Number(input.z)||0;
    if(this.dead||this.disabled){ix=0;iz=0;}
    const inputLength=Math.hypot(ix,iz);
    if(inputLength>1){ix/=inputLength;iz/=inputLength;}
    const moving=inputLength>.06;
    if(this.grounded){this.coyote=.115;this.airTime=0;}else {this.coyote=Math.max(0,this.coyote-dt);this.airTime+=dt;}
    const cooking=this.cookingSoftness;
    let maxSpeed=(input.run===false?7.4:10.5)*(1-Math.max(0,cooking-.55)*.12);
    if(input.crouch&&this.grounded)maxSpeed=3.2;
    const slippery=this.surface.includes('SLIPPERY')&&!this.surface.includes('NOT_SLIPPERY');
    if(!this.diving&&!this.pounding) {
      const accel=(this.grounded?(slippery?23:37):14)*(1+(.55-cooking)*(cooking>.55?.5:.24));
      if(moving) {
        const targetX=ix*maxSpeed,targetZ=iz*maxSpeed;
        const factor=1-Math.exp(-accel/maxSpeed*dt);
        v.x+=(targetX-v.x)*factor;v.z+=(targetZ-v.z)*factor;
        const targetYaw=Math.atan2(ix,iz),diff=Math.atan2(Math.sin(targetYaw-this.yaw),Math.cos(targetYaw-this.yaw));
        this.yaw+=diff*(1-Math.exp(-(this.grounded?11:5)*dt));
      } else {
        const drag=this.grounded?(slippery?1.75:4.6)*(1+(.55-cooking)*.9):.32;
        v.x*=Math.exp(-drag*dt);v.z*=Math.exp(-drag*dt);
      }
    } else if(this.diving&&this.grounded) {
      v.x*=Math.exp(-3.4*dt);v.z*=Math.exp(-3.4*dt);
      if(Math.hypot(v.x,v.z)<2){this.diving=false;}
    }
    if(this.jumpBuffer>0&&this.coyote>0&&!this.disabled&&!this.dead) {
      let jump=13;
      if(input.crouch&&Math.hypot(v.x,v.z)>2.4) {
        jump=9.7;v.x+=Math.sin(this.yaw)*6.1;v.z+=Math.cos(this.yaw)*6.1;this.jumpCount=0;
      } else {
        this.jumpCount=this.landingTimer<.28&&moving?(this.jumpCount+1)%3:0;
        jump=[13,15,17][this.jumpCount];
      }
      v.y=jump;this.grounded=false;this.coyote=0;this.jumpBuffer=0;this.diving=false;this.pounding=false;
      this.squashVelocity=-3;this.events.push('jump');result.jumped=true;
    }
    p.x+=v.x*dt;p.z+=v.z*dt;
    const walls=this.physics.resolveWalls(p,this.radius,input.crouch&&this.grounded?1.15:this.height);
    if(walls.hit) {
      const wm=Math.hypot(walls.x,walls.z);
      if(wm>EPS) {
        const nx=walls.x/wm,nz=walls.z/wm,inward=v.x*nx+v.z*nz;
        if(inward<0){v.x-=nx*inward;v.z-=nz*inward;}
      }
    }
    // Snap only within a small physical step; upper decks never teleport Mario.
    const floor=this.physics.groundAt(p.x,p.z,oldY+(wasGrounded?.58:.12));
    const canStand=floor&&floor.walkable;
    const stepDown=.24+Math.hypot(v.x,v.z)*dt*.85;
    if(this.grounded&&canStand&&floor.height>=oldY-stepDown&&floor.height<=oldY+.58) {
      p.y=floor.height;v.y=0;this.groundNormal=floor.normal;this.surface=floor.surface;
    } else {
      this.grounded=false;
      v.y-=dt*(this.pounding?58:28.5);
      p.y+=v.y*dt;
      if(v.y>0) {
        const ceiling=this.physics.ceilingAt(p.x,p.z,oldY+this.height-.08);
        if(ceiling&&p.y+this.height>ceiling.height) {p.y=ceiling.height-this.height-.01;v.y=-.3;}
      }
      if(floor&&v.y<=0&&p.y<=floor.height&&oldY>=floor.height-.15) {
        const landingSpeed=-v.y;
        p.y=floor.height;v.y=0;this.surface=floor.surface;this.groundNormal=floor.normal;
        if(canStand) {
          this.grounded=true;this.coyote=.115;
          if(!wasGrounded&&this.airTime>.07) {
            result.landed=true;result.landingSpeed=landingSpeed;this.lastLandingSpeed=landingSpeed;
            this.landingTimer=0;this.squashVelocity+=Math.min(landingSpeed*(.3+.36*cooking),10);this.events.push('land');
            if(this.pounding){result.groundPound=true;this.events.push('pound');}
          }
          this.pounding=false;
        } else {
          // On steep cooked pasta the downhill projection of gravity wins.
          const nx=floor.normal[0],nz=floor.normal[2];
          v.x+=nx*dt*26;v.z+=nz*dt*26;
        }
      }
    }
    if(this.grounded&&slippery&&this.groundNormal[1]<.98) {
      const drift=this.surface.includes('VERY_SLIPPERY')?15:4;
      v.x+=this.groundNormal[0]*dt*drift;v.z+=this.groundNormal[2]*dt*drift;
    }
    if(!Number.isFinite(p.x+p.y+p.z)) {this.reset(this._spawn);return;}
    if((p.y < (this.killFloorY??-40)||(this.grounded&&this.surface.includes('DEATH_PLANE')))&&!this.dead){this.health=0;this.dead=true;this.events.push('death');}
  }
}
