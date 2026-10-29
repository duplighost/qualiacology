import * as THREE from './vendor/three.module.js';

// A real geometry renderer for devices where WebGL is unavailable. The same
// scene, transforms, camera, texture, and animated noodle paths are projected
// into Canvas 2D. It intentionally omits GPU lighting and uses a lower detail.
export class CanvasPastaRenderer {
  constructor({canvas}) {
    this.domElement = canvas;
    this.context = canvas.getContext('2d', {alpha:false, desynchronized:true});
    if (!this.context) throw new Error('Neither WebGL nor Canvas 2D is available.');
    this.isSoftware = true;
    this.shadowMap = {enabled:false, type:0};
    this.info = {render:{calls:0, triangles:0, lines:0}, memory:{geometries:0,textures:0}};
    this.geometryCache = new WeakMap(); this.patternCache = new WeakMap();
    this.mv = new THREE.Matrix4(); this.frustum = new THREE.Frustum(); this.clip = new THREE.Matrix4();
    this.sphere = new THREE.Sphere(); this.size = {width:1,height:1};
    this.pixelRatio = 1; this.width = this.height = 1; this.maxWidth=960; this.maxHeight=640;
    this.maxSegments = 3200; this.depthWidth = 180; this.depthHeight = 125;
    this.depthBuffer = new Float32Array(this.depthWidth * this.depthHeight);
  }
  setPixelRatio(value) { this.pixelRatio = Math.min(1, value || 1); }
  getPixelRatio() { return this.pixelRatio; }
  setSize(width, height, updateStyle = true) {
    this.size.width = width; this.size.height = height;
    const scale = Math.min(1, this.maxWidth / width, this.maxHeight / height) * this.pixelRatio;
    this.width = Math.max(1, Math.round(width * scale)); this.height = Math.max(1, Math.round(height * scale));
    this.domElement.width = this.width; this.domElement.height = this.height;
    if (updateStyle) {this.domElement.style.width = width + 'px';this.domElement.style.height = height + 'px';}
    this.depthWidth = Math.max(80, Math.round(this.width / 4)); this.depthHeight = Math.max(60, Math.round(this.height / 4));
    this.depthBuffer = new Float32Array(this.depthWidth * this.depthHeight);
  }
  dispose() {}
  getSize(target) { return target.set(this.size.width, this.size.height); }

  getPattern(material) {
    const image = material.map?.image;
    if (!image || !(image.width > 0) || !(image.height > 0)) return null;
    let record = this.patternCache.get(material);
    if (record?.image === image) return record;
    const tile = document.createElement('canvas'); tile.width = tile.height = 256;
    const c = tile.getContext('2d'); c.drawImage(image, 0, 0, 256, 256);
    c.globalCompositeOperation = 'multiply'; c.fillStyle = material.color?.getStyle() || '#ffffff';c.fillRect(0,0,256,256);
    if (material.alphaTest > 0) {c.globalCompositeOperation = 'destination-in';c.drawImage(image,0,0,256,256);}
    record = {image, tile, pattern:this.context.createPattern(tile,'repeat'), size:256, shades:new Map()};
    this.patternCache.set(material,record); return record;
  }

  getNoodles(geometry) {
    const p = geometry.attributes.position, uv = geometry.attributes.uv;
    let cached = this.geometryCache.get(geometry);
    if (cached && cached.version === p.version) return cached;
    if (!geometry.index || !uv) return null;
    const a = p.array, tex = uv.array, starts = [];
    for (let i = 0; i < p.count; i++) if (Math.abs(tex[i * 2]) < .00001) starts.push(i);
    if (starts.length < 2 || starts.length > p.count / 3) return null;
    const lines = []; let line = [], previousT = -1;
    const finish = () => {
      if (line.length > 1) {
        let x0=Infinity,y0=Infinity,z0=Infinity,x1=-Infinity,y1=-Infinity,z1=-Infinity;
        for(const p of line){x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);z0=Math.min(z0,p[2]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);z1=Math.max(z1,p[2]);}
        lines.push({points:line,cx:(x0+x1)*.5,cy:(y0+y1)*.5,cz:(z0+z1)*.5,r:Math.hypot(x1-x0,y1-y0,z1-z0)*.5+.1});
      }
      line=[];
    };
    for (let r = 0; r < starts.length; r++) {
      const begin=starts[r],end=r+1<starts.length?starts[r+1]:p.count,n=end-begin;
      if(n<3||n>12)continue;
      const t=tex[begin*2+1];if(t<=previousT+.000001)finish();previousT=t;
      let x=0,y=0,z=0;
      for(let i=begin;i<end;i++){x+=a[i*3];y+=a[i*3+1];z+=a[i*3+2];}x/=n;y/=n;z/=n;
      let radius=0;for(let i=begin;i<end;i++)radius+=Math.hypot(a[i*3]-x,a[i*3+1]-y,a[i*3+2]-z);radius/=n;
      line.push([x,y,z,radius]);
    }
    finish(); if(!lines.length)return null;cached={lines,version:p.version};this.geometryCache.set(geometry,cached);return cached;
  }

  render(scene,camera) {
    const renderStart=performance.now();this.activeFog=scene.userData?.pastaFog||null;
    scene.updateMatrixWorld();camera.updateMatrixWorld();camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    const ctx=this.context,W=this.width,H=this.height,halfW=W*.5,halfH=H*.5,P=camera.projectionMatrix.elements;
    this.clip.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);this.frustum.setFromProjectionMatrix(this.clip);
    const bg=scene.background?.isColor?scene.background.getStyle():'#e7dfc8';
    const background=ctx.createLinearGradient(0,0,0,H);background.addColorStop(0,'#f6edda');background.addColorStop(.7,bg);background.addColorStop(1,'#bbab83');
    ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.fillStyle=background;ctx.fillRect(0,0,W,H);
    const backdrop=scene.background?.isTexture?scene.background.image:null;
    if(backdrop?.width&&backdrop?.height){const scale=Math.max(W/backdrop.width,H/backdrop.height),bw=backdrop.width*scale,bh=backdrop.height*scale;ctx.drawImage(backdrop,(W-bw)*.5,(H-bh)*.5,bw,bh);}
    this.depthBuffer.fill(Infinity);
    const faces=[],strokes=[],meshes=[];scene.traverseVisible(o=>{if(o.isMesh&&o.geometry?.attributes?.position&&o.material?.visible!==false)meshes.push(o);});
    const near=Math.max(.08,camera.near+.02),far=Math.min(camera.far,350),project=p=>[halfW+P[0]*p[0]/(-p[2])*halfW,halfH-P[5]*p[1]/(-p[2])*halfH,-p[2],p[3],p[4]];
    const toCamera=(x,y,z,M)=>[M[0]*x+M[4]*y+M[8]*z+M[12],M[1]*x+M[5]*y+M[9]*z+M[13],M[2]*x+M[6]*y+M[10]*z+M[14]];
    for(const object of meshes) {
      const geometry=object.geometry.userData.softwareGeometry||object.geometry,material=Array.isArray(object.material)?object.material[0]:object.material;
      if(!material||material.opacity===0)continue;
      if(!geometry.boundingSphere)geometry.computeBoundingSphere();
      this.sphere.copy(geometry.boundingSphere).applyMatrix4(object.matrixWorld);
      if(object.frustumCulled!==false&&!this.frustum.intersectsSphere(this.sphere))continue;
      this.mv.multiplyMatrices(camera.matrixWorldInverse,object.matrixWorld);const M=this.mv.elements.slice();
      const noodle=this.getNoodles(geometry);
      if(noodle) {this.addNoodles(noodle,object,material,M,P,W,H,near,far,strokes);continue;}
      const positions=geometry.attributes.position.array,uv=geometry.attributes.uv?.array,indices=geometry.index?.array;
      const normals=geometry.attributes.normal?.array,count=indices?indices.length:positions.length/3;
      const pattern=this.getPattern(material),color=material.color?.getStyle()||'#dbc28e';
      const map=material.map,repeatX=map?.repeat?.x||1,repeatY=map?.repeat?.y||1,offsetX=map?.offset?.x||0,offsetY=map?.offset?.y||0;
      const nm=object.matrixWorld.elements;
      for(let i=0;i<count;i+=3){
        const ia=indices?indices[i]:i,ib=indices?indices[i+1]:i+1,ic=indices?indices[i+2]:i+2;
        let polygon=[];
        for(const index of [ia,ib,ic]){const p=toCamera(positions[index*3],positions[index*3+1],positions[index*3+2],M);p.push(uv?(uv[index*2]*repeatX+offsetX):0,uv?(-uv[index*2+1]*repeatY+offsetY):0);polygon.push(p);}
        if(polygon.every(p=>-p[2]<near)||polygon.every(p=>-p[2]>far))continue;
        if(polygon.some(p=>-p[2]<near)){
          const clipped=[];for(let j=0;j<polygon.length;j++){const a=polygon[j],b=polygon[(j+1)%polygon.length],ina=a[2]<=-near,inb=b[2]<=-near;if(ina)clipped.push(a);if(ina!==inb){const t=(-near-a[2])/(b[2]-a[2]);clipped.push(a.map((v,k)=>v+(b[k]-v)*t));}}polygon=clipped;
        }
        if(polygon.length<3)continue;
        let shade=.90;
        if(normals){const x=normals[ia*3],y=normals[ia*3+1],z=normals[ia*3+2],nx=nm[0]*x+nm[4]*y+nm[8]*z,ny=nm[1]*x+nm[5]*y+nm[9]*z,nz=nm[2]*x+nm[6]*y+nm[10]*z;shade=.68+.32*Math.max(0,(-.45*nx+.8*ny+.35*nz)/Math.hypot(nx,ny,nz));}
        const projected=polygon.map(project);
        for(let j=1;j<projected.length-1;j++){
          const tri=[projected[0],projected[j],projected[j+1]];
          if(tri.every(p=>p[0]<-1)||tri.every(p=>p[0]>W+1)||tri.every(p=>p[1]<-1)||tri.every(p=>p[1]>H+1))continue;
          const area=(tri[1][0]-tri[0][0])*(tri[2][1]-tri[0][1])-(tri[1][1]-tri[0][1])*(tri[2][0]-tri[0][0]);if(Math.abs(area)<.2)continue;
          faces.push({tri,pattern,color,shade,depth:(tri[0][2]+tri[1][2]+tri[2][2])/3,alpha:material.opacity??1,lattice:material.alphaTest>0,depthWrite:material.depthWrite!==false&&(!material.transparent||(material.opacity??1)>.97)});
        }
      }
    }
    faces.sort((a,b)=>b.depth-a.depth);
    for(const f of faces){this.drawFace(f);if(!f.lattice&&f.depthWrite)this.depthFace(f.tri);}
    strokes.sort((a,b)=>(b.priority-a.priority)||(a.depth-b.depth));
    const visibleStrokes=strokes.length>this.maxSegments?strokes.slice(0,this.maxSegments):strokes;
    visibleStrokes.sort((a,b)=>b.depth-a.depth);
    ctx.lineCap='round';ctx.lineJoin='round';let drawn=0;
    for(const s of visibleStrokes){
      ctx.globalAlpha=s.alpha??1;
      if(drawn>=this.maxSegments)break;
      const mx=(s.x0+s.x1)*.5,my=(s.y0+s.y1)*.5;
      const gx=Math.max(0,Math.min(this.depthWidth-1,Math.floor(mx/W*this.depthWidth))),gy=Math.max(0,Math.min(this.depthHeight-1,Math.floor(my/H*this.depthHeight)));
      const limit=this.depthBuffer[gy*this.depthWidth+gx];if(s.depth>limit+Math.max(.16,s.radius*3))continue;
      ctx.beginPath();ctx.moveTo(s.x0,s.y0);ctx.lineTo(s.x1,s.y1);ctx.lineWidth=s.width;ctx.strokeStyle=s.width>2?s.dark:s.color;ctx.stroke();
      if(s.width>2){ctx.beginPath();ctx.moveTo(s.x0-s.width*.07,s.y0-s.width*.10);ctx.lineTo(s.x1-s.width*.07,s.y1-s.width*.10);ctx.lineWidth=s.width*.72;ctx.strokeStyle=s.color;ctx.stroke();}
      if(s.width>4){ctx.beginPath();ctx.moveTo(s.x0-s.width*.13,s.y0-s.width*.23);ctx.lineTo(s.x1-s.width*.13,s.y1-s.width*.23);ctx.lineWidth=Math.max(.38,s.width*.15);ctx.strokeStyle=s.light;ctx.stroke();}
      if(this.activeFog){const fog=this.activeFog,amount=Math.max(0,Math.min(1,(s.depth-fog.near)/(fog.far-fog.near)))*(fog.amount??1);if(amount>.005){ctx.globalAlpha=(s.alpha??1)*amount;ctx.beginPath();ctx.moveTo(s.x0,s.y0);ctx.lineTo(s.x1,s.y1);ctx.lineWidth=s.width;ctx.strokeStyle=fog.color;ctx.stroke();}}
      drawn++;
    }
    ctx.globalAlpha=1;this.info.render.calls=faces.length+drawn;this.info.render.triangles=faces.length;this.info.render.lines=drawn;this.lastRenderMs=performance.now()-renderStart;
  }

  addNoodles(noodle,object,material,M,P,W,H,near,far,output) {
    let ancestor=object,priority=0;while(ancestor){if(/Spaghetti Mario/.test(ancestor.name)){priority=3;break;}if(/King|Whomp|Unagi|Eel|Treasure|Star box|Boo|Haunted chair|Mad piano|Dorrie|Bully|Klepto|[Ss]ubmarine|Tox Box|Tweester|[Pp]enguin|[Ss]nowman|Piranha|Fwoosh|[Aa]rrow lift|[Ww]ater diamond/.test(ancestor.name)){priority=Math.max(priority,2);}ancestor=ancestor.parent;}
    const color=material.color?.clone()||new THREE.Color('#ddc38c');color.convertLinearToSRGB();
    const r=Math.round(color.r*255),g=Math.round(color.g*255),b=Math.round(color.b*255);
    const base=`rgb(${r},${g},${b})`,dark=`rgb(${Math.round(r*.65)},${Math.round(g*.62)},${Math.round(b*.57)})`,light=`rgba(255,246,218,.66)`;
    const halfW=W*.5,halfH=H*.5,scale=Math.max(Math.hypot(M[0],M[1],M[2]),Math.hypot(M[4],M[5],M[6]),Math.hypot(M[8],M[9],M[10]));
    for(const line of noodle.lines){
      const cz=-(M[2]*line.cx+M[6]*line.cy+M[10]*line.cz+M[14]),extent=line.r*scale;
      if(cz+extent<near||cz-extent>far)continue;
      const cx=M[0]*line.cx+M[4]*line.cy+M[8]*line.cz+M[12],cy=M[1]*line.cx+M[5]*line.cy+M[9]*line.cz+M[13];
      if(cz>extent&&(Math.abs(cx)>(cz+extent)/P[0]+extent||Math.abs(cy)>(cz+extent)/P[5]+extent))continue;
      const averageRadius=line.points[0][3]*scale,screenRadius=averageRadius*P[5]*halfH/Math.max(near,cz);
      if(screenRadius<(priority?.16:.27))continue;
      const stride=screenRadius<.75?3:screenRadius<1.4?2:1;
      const points=line.points;let previous=null;
      for(let i=0;i<points.length;i+=stride){
        const p=points[Math.min(i,points.length-1)],x=M[0]*p[0]+M[4]*p[1]+M[8]*p[2]+M[12],y=M[1]*p[0]+M[5]*p[1]+M[9]*p[2]+M[13],depth=-(M[2]*p[0]+M[6]*p[1]+M[10]*p[2]+M[14]);
        if(depth<near||depth>far){previous=null;continue;}
        const projected=[halfW+P[0]*x/depth*halfW,halfH-P[5]*y/depth*halfH,depth,p[3]*scale];
        if(previous){
          const [x0,y0,d0,r0]=previous,[x1,y1,d1,r1]=projected;
          if(!((x0<0&&x1<0)||(x0>W&&x1>W)||(y0<0&&y1<0)||(y0>H&&y1>H))){
            const depth=(d0+d1)*.5,width=Math.max(.6,Math.min(130,(r0+r1)*P[5]*halfH/depth));
            if(Math.hypot(x1-x0,y1-y0)>.12)output.push({x0,y0,x1,y1,depth:depth-.012,radius:(r0+r1)*.5,width,color:base,dark,light,priority,alpha:material.opacity??1});
          }
        }
        previous=projected;
      }
    }
  }

  drawFace(face){
    const c=this.context,t=face.tri;c.globalAlpha=face.alpha;
    c.beginPath();c.moveTo(t[0][0],t[0][1]);c.lineTo(t[1][0],t[1][1]);c.lineTo(t[2][0],t[2][1]);c.closePath();
    if(face.pattern){
      const size=face.depth>80?64:face.depth>35?128:face.pattern.size;
      const u0=t[0][3]*size,v0=t[0][4]*size,u1=t[1][3]*size,v1=t[1][4]*size,u2=t[2][3]*size,v2=t[2][4]*size;
      const du1=u1-u0,dv1=v1-v0,du2=u2-u0,dv2=v2-v0,det=du1*dv2-du2*dv1;
      if(Math.abs(det)>1e-7){
        const dx1=t[1][0]-t[0][0],dy1=t[1][1]-t[0][1],dx2=t[2][0]-t[0][0],dy2=t[2][1]-t[0][1];
        const a=(dx1*dv2-dx2*dv1)/det,b=(dy1*dv2-dy2*dv1)/det,cc=(dx2*du1-dx1*du2)/det,d=(dy2*du1-dy1*du2)/det,e=t[0][0]-a*u0-cc*v0,f=t[0][1]-b*u0-d*v0;
        const shade=Math.round(face.shade*10)/10,shadeKey=size+':'+shade;let pattern=face.pattern.shades.get(shadeKey);
        if(!pattern){
          const tile=document.createElement('canvas');tile.width=tile.height=size;const tc=tile.getContext('2d');tc.drawImage(face.pattern.tile,0,0,size,size);
          tc.globalCompositeOperation='source-atop';tc.fillStyle=`rgba(42,28,11,${Math.max(0,1-shade)})`;tc.fillRect(0,0,size,size);
          pattern=c.createPattern(tile,'repeat');face.pattern.shades.set(shadeKey,pattern);
        }
        // Pattern transforms avoid enormous offscreen UV fill rectangles and
        // per-triangle clip masks, the main CPU bottleneck in software Canvas.
        if(pattern.setTransform){pattern.setTransform({a,b,c:cc,d,e,f});c.fillStyle=pattern;c.fill();}
        else{c.save();c.clip();c.setTransform(a,b,cc,d,e,f);c.fillStyle=pattern;c.fillRect(Math.min(u0,u1,u2)-1,Math.min(v0,v1,v2)-1,Math.max(u0,u1,u2)-Math.min(u0,u1,u2)+2,Math.max(v0,v1,v2)-Math.min(v0,v1,v2)+2);c.restore();}
      }else{c.fillStyle=face.color;c.fill();}
    }else{c.fillStyle=face.color;c.fill();}
    if(this.activeFog&&!face.lattice){const fog=this.activeFog,amount=Math.max(0,Math.min(1,(face.depth-fog.near)/(fog.far-fog.near)))*(fog.amount??1);if(amount>.005){c.globalAlpha=face.alpha*amount;c.fillStyle=fog.color;c.fill();}}
  }

  depthFace(t){
    const sw=this.depthWidth,sh=this.depthHeight,fx=sw/this.width,fy=sh/this.height;
    const a=[t[0][0]*fx,t[0][1]*fy,1/t[0][2]],b=[t[1][0]*fx,t[1][1]*fy,1/t[1][2]],c=[t[2][0]*fx,t[2][1]*fy,1/t[2][2]];
    const x0=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),x1=Math.min(sw-1,Math.ceil(Math.max(a[0],b[0],c[0]))),y0=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),y1=Math.min(sh-1,Math.ceil(Math.max(a[1],b[1],c[1])));
    const det=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(det)<.0001)return;
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const u=((b[1]-c[1])*(x+.5-c[0])+(c[0]-b[0])*(y+.5-c[1]))/det,v=((c[1]-a[1])*(x+.5-c[0])+(a[0]-c[0])*(y+.5-c[1]))/det,w=1-u-v;
      if(u>=-.01&&v>=-.01&&w>=-.01){const depth=1/(u*a[2]+v*b[2]+w*c[2]),i=y*sw+x;if(depth<this.depthBuffer[i])this.depthBuffer[i]=depth;}
    }
  }
}
