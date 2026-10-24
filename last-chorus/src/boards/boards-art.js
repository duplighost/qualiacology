import * as THREE from 'three';

/* Original modeled deck collection. Metres, Y up, -Z nose, +Z exhaust. */
export const ART_BOARDS = [
  {id:'stained-saint',name:'Stained Saint',accent:'#d950ff',secondary:'#42e9e3',description:'Blackened cathedral metal, brass tracery and jewel-coloured glass.',trail:'Prismatic stained-glass fragments',category:'RELIC / GLASS'},
  {id:'razor-bloom',name:'Razor Bloom',accent:'#ff2a92',secondary:'#f6a8dd',description:'Swept obsidian blades around a luminous, metal-petalled flower.',trail:'Satin ribbons and falling petals',category:'BLADE / BLOOM'},
  {id:'midnight-koi',name:'Midnight Koi',accent:'#37c5ef',secondary:'#efb968',description:'A fork-tailed pearl cruiser with cobalt koi and individually inlaid scales.',trail:'Blue silk wakes and golden droplets',category:'PEARL / TIDE'},
  {id:'ghost-orchid',name:'Ghost Orchid',accent:'#bfadff',secondary:'#d7fff6',description:'Porcelain petals, an open orchid tail and recessed lavender light.',trail:'Spectral moths and cool drifting mist',category:'PORCELAIN / GHOST'},
];

const V=(x,y,z)=>new THREE.Vector3(x,y,z);
function mat(name,color,metalness=.65,roughness=.3,extra={}) { const m=new THREE.MeshPhysicalMaterial({color,metalness,roughness,clearcoat:.8,clearcoatRoughness:.2,...extra});m.name=name;return m; }
function glow(name,color,strength=1.3) {return mat(name,color,.28,.26,{emissive:color,emissiveIntensity:strength});}
function mesh(group,name,geometry,material,pos=[0,0,0],rot=[0,0,0]){const m=new THREE.Mesh(geometry,material);m.name=name;m.position.set(...pos);m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
function polygon(points){const s=new THREE.Shape();points.forEach(([x,z],i)=>i?s.lineTo(x,z):s.moveTo(x,z));s.closePath();return s;}
function slab(group,name,shape,material,top=.10,depth=.10,bevel=.015,segments=2){const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:segments,steps:1,curveSegments:14});g.rotateX(Math.PI/2);g.translate(0,top,0);return mesh(group,name,g,material);}
function trace(group,name,points,material,r=.006,closed=false,segments=40){const vectors=points.map(p=>V(...p));if(closed&&vectors[0].distanceToSquared(vectors[vectors.length-1])<1e-12)vectors.pop();const curve=new THREE.CatmullRomCurve3(vectors,closed,'centripetal');const geo=new THREE.TubeGeometry(curve,segments,r,5,closed);if(closed){const p=geo.attributes.position,v=new THREE.Vector3(),before=new THREE.Vector3(),after=new THREE.Vector3();for(let i=0;i<=segments;i++){const k=i%segments,c=curve.getPointAt(k/segments),prev=curve.getPointAt(((k-1+segments)%segments)/segments),next=curve.getPointAt(((k+1)%segments)/segments);before.subVectors(c,prev);after.subVectors(next,c);const turn=before.angleTo(after),limit=Math.min(before.length(),after.length())*.20/Math.max(.05,Math.sin(turn/2)),ratio=Math.min(1,limit/r);for(let j=0;j<=5;j++){let idx=i*6+j;v.fromBufferAttribute(p,idx).sub(c).multiplyScalar(ratio).add(c);p.setXYZ(idx,v.x,v.y,v.z);}}geo.computeVertexNormals();}return mesh(group,name,geo,material);}
function rim(group,name,shape,y,material,r=.006,segments=100){return trace(group,name,shape.getSpacedPoints(segments).map(p=>[p.x,y,p.y]),material,r,true,segments);}
function disk(group,name,x,y,z,r,h,material,n=28){return mesh(group,name,new THREE.CylinderGeometry(r,r,h,n),material,[x,y,z]);}
function ring(group,name,x,y,z,r,tube,material,arc=Math.PI*2,n=32){return mesh(group,name,new THREE.TorusGeometry(r,tube,5,n,arc),material,[x,y,z],[Math.PI/2,0,0]);}
function ellipsoid(group,name,material,x,y,z,sx,sy,sz){const m=mesh(group,name,new THREE.SphereGeometry(1,20,10),material,[x,y,z]);m.scale.set(sx,sy,sz);return m;}
function strip(group,name,pts,width,material,y=.145){const pos=[],ind=[];for(let i=0;i<pts.length;i++){const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)];const dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz)||1;pos.push(pts[i][0]-dz/L*width/2,y,pts[i][1]+dx/L*width/2,pts[i][0]+dz/L*width/2,y,pts[i][1]-dx/L*width/2);if(i<pts.length-1){const j=i*2;ind.push(j,j+2,j+1,j+1,j+2,j+3);}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(ind);geo.computeVertexNormals();return mesh(group,name,geo,material);}
function inlayOutline(group,name,shape,width,material,y,segments=72){const pts=shape.getSpacedPoints(segments);for(let i=0;i<segments;i++)strip(group,name,[[pts[i].x,pts[i].y],[pts[i+1].x,pts[i+1].y]],width,material,y);}
function arcStrip(group,name,cx,cz,r,a0,a1,width,material,y=.145,steps=16){const pts=[];for(let i=0;i<=steps;i++){let a=a0+(a1-a0)*i/steps;pts.push([cx+Math.cos(a)*r,cz+Math.sin(a)*r]);}return strip(group,name,pts,width,material,y);}
function grip(group,name,x,z,width,length,material,y=.135,angle=0){const g=new THREE.Group();g.name=name;g.position.set(x,y,z);g.rotation.y=angle;group.add(g);const shape=new THREE.Shape();const w=width/2,l=length/2,r=.028;shape.moveTo(-w+r,-l);shape.lineTo(w-r,-l);shape.quadraticCurveTo(w,-l,w,-l+r);shape.lineTo(w,l-r);shape.quadraticCurveTo(w,l,w-r,l);shape.lineTo(-w+r,l);shape.quadraticCurveTo(-w,l,-w,l-r);shape.lineTo(-w,-l+r);shape.quadraticCurveTo(-w,-l,-w+r,-l);slab(g,'recessed grip',shape,material,0,.014,.003,1);for(let i=0;i<8;i++){mesh(g,'traction rib',new THREE.BoxGeometry(width*.78,.004,.006),material,[0,.005,(i-3.5)*length/9],[0,0,0]);}return g;}
function screw(group,x,z,material,y=.135,r=.013){disk(group,'recessed titanium fastener',x,y,z,r,.004,material,10);const dark=material.userData.slotMat||material;mesh(group,'fastener drive',new THREE.BoxGeometry(r*1.2,.0015,r*.19),dark,[x,y+.003,z],[0,Math.PI/4,0]);}
function propulsion(group,materials,{centers=[[-.18,.45],[.18,.45]],radius=.09,y=-.105}={}){const {metal,dark,light}=materials;for(const [x,z]of centers){disk(group,'ducted lift housing',x,y,z,radius+.027,.075,metal,24);disk(group,'ceramic stator',x,y-.041,z,radius,.008,dark,24);ring(group,'ion aperture',x,y-.048,z,radius*.79,.009,light,Math.PI*2,24);disk(group,'lift hub',x,y-.046,z,radius*.24,.014,metal,14);for(let j=0;j<8;j++){const a=j*Math.PI/4;const m=mesh(group,'radial stator vane',new THREE.BoxGeometry(radius*.52,.008,.013),metal,[x+Math.cos(a)*radius*.48,y-.047,z+Math.sin(a)*radius*.48],[0,-a+.34,0]);}ring(group,'housing bezel',x,y+.041,z,radius+.015,.006,metal,Math.PI*2,24);}}
function anchors(group,{tailZ=.88,tailX=.19,footZ=.43,footY=.157}={}){for(const [name,x,y,z]of [['trail_left',-tailX,-.08,tailZ],['trail_right',tailX,-.08,tailZ],['foot_front',0,footY,-footZ],['foot_back',0,footY,footZ]]){const o=new THREE.Object3D();o.name=name;o.position.set(x,y,z);group.add(o);}return group;}
function root(id){const g=new THREE.Group();g.name=id;g.userData={asset:'Last Chorus original hoverboard',id,units:'meters',forward:'-Z',deckHeight:.15};return g;}

function stainedSaint(){
  const g=root('stained-saint');
  const black=mat('Saint / blackened titanium','#12131d',.84,.28),bronze=mat('Saint / burnished brass','#bd8c45',.92,.28),rubber=mat('Saint / graphite grip','#1c1925',.06,.82),core=mat('Saint / smoked underside','#292233',.72,.35),purple=glow('Saint / amethyst glass','#7b35d9',.52),pink=glow('Saint / rose glass','#db3c8f',.62),cyan=glow('Saint / teal glass','#1ab7b6',.58),blue=glow('Saint / midnight glass','#3541ac',.58),amber=glow('Saint / amber glass','#eb9c45',.48),edge=glow('Saint / violet ion channel','#aa57ff',1.3),lead=mat('Saint / structural lead came','#25212c',.87,.33);
  const s=new THREE.Shape();s.moveTo(0,-1.08);s.bezierCurveTo(.12,-.97,.27,-.77,.30,-.52);s.bezierCurveTo(.34,-.18,.33,.44,.265,.72);s.lineTo(.16,.93);s.lineTo(.06,.87);s.lineTo(0,.995);s.lineTo(-.06,.87);s.lineTo(-.16,.93);s.lineTo(-.265,.72);s.bezierCurveTo(-.33,.44,-.34,-.18,-.30,-.52);s.bezierCurveTo(-.27,-.77,-.12,-.97,0,-1.08);s.closePath();
  slab(g,'cast cathedral shell',s,black,.102,.105,.020,3);
  const lower=slab(g,'lower scalloped brass frame',s,bronze,.004,.035,.013,2);lower.scale.set(.965,1,.976);
  rim(g,'brass rolled edge',s,.102,bronze,.007);
  const rs=s.clone();const rmesh=rim(g,'recessed light seam',rs,.035,edge,.005);rmesh.scale.set(.982,1,.985);
  // A broad central rose window: individually cut curved enamel-glass petals.
  disk(g,'rose window black recess',0,.124,0,.258,.014,black,48);
  disk(g,'complete midnight glass window',0,.135,0,.235,.006,blue,48);
  ring(g,'rose window outer gilding',0,.136,0,.244,.007,bronze,Math.PI*2,48);
  const glass=[pink,purple,cyan,blue,amber,purple,cyan,pink];
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4;const petal=new THREE.Shape();const u=(r,t)=>[Math.sin(t)*r,Math.cos(t)*r];const p0=u(.043,a),p1=u(.12,a-.27),p2=u(.233,a-.19),p3=u(.232,a),p4=u(.233,a+.19),p5=u(.12,a+.27);petal.moveTo(...p0);petal.bezierCurveTo(...p1,...p2,...p3);petal.bezierCurveTo(...p4,...p5,...p0);petal.closePath();slab(g,'rose glass petal '+i,petal,glass[i],.142,.006,.0015,1);rim(g,'rose lead came '+i,petal,.146,lead,.0045,36);
  }
  for(let i=0;i<8;i++){const a=(i+.5)*Math.PI/4;strip(g,'rose radial structural came',[[Math.sin(a)*.043,Math.cos(a)*.043],[Math.sin(a)*.237,Math.cos(a)*.237]],.009,lead,.151);}
  ring(g,'rose middle circular came',0,.151,0,.133,.0045,lead,Math.PI*2,40);
  ring(g,'rose outer circular came',0,.150,0,.206,.0033,bronze,Math.PI*2,48);
  disk(g,'rose centre sapphire',0,.147,0,.039,.012,cyan,12);ring(g,'rose central bezel',0,.153,0,.04,.004,bronze,Math.PI*2,20);
  // Pointed gothic tracery on the free nose/tail portions.
  for(const [z,scale,flip] of [[-.76,.76,1],[.76,.63,-1]]){
    const arch=new THREE.Shape();arch.moveTo(0,-.205*flip);arch.bezierCurveTo(.095,-.09*flip,.12,.03*flip,.10,.155*flip);arch.lineTo(-.10,.155*flip);arch.bezierCurveTo(-.12,.03*flip,-.095,-.09*flip,0,-.205*flip);arch.closePath();const aG=new THREE.Group();aG.position.z=z;aG.scale.set(scale,1,scale);g.add(aG);slab(aG,'pointed glass lancet',arch,flip===1?purple:pink,.137,.006,.001,1);rim(aG,'lancet brass surround',arch,.141,bronze,.006,44);strip(aG,'window mullion',[[0,-.19*flip],[0,.15*flip]],.009,bronze,.145);strip(aG,'window transom',[[-.09,.035*flip],[.09,.035*flip]],.007,bronze,.146);
  }
  for(const side of [-1,1])for(const z of [-.44,.43]){const lancet=new THREE.Shape();lancet.moveTo(0,-.133);lancet.bezierCurveTo(.031,-.094,.033,-.04,.028,.097);lancet.lineTo(-.028,.097);lancet.bezierCurveTo(-.033,-.04,-.031,-.094,0,-.133);lancet.closePath();const gallery=new THREE.Group();gallery.position.set(side*.264,0,z);g.add(gallery);slab(gallery,'side gallery stained-glass lancet',lancet,side<0?purple:cyan,.134,.005,.001,1);rim(gallery,'side gallery gilded tracery',lancet,.141,bronze,.0035,28);strip(gallery,'side gallery mullion',[[0,-.122],[0,.091]],.0045,lead,.144);strip(gallery,'side gallery transom',[[-.026,.015],[.026,.015]],.0045,lead,.144);}
  for(const z of [-.42,.43]){grip(g,'sculpted standing pad',0,z,.42,.215,rubber,.133);for(const x of [-.265,.265])screw(g,x,z,bronze);}
  for(const side of [-1,1]){trace(g,'longitudinal brass rib',[[side*.23,.14,-.64],[side*.29,.14,-.33],[side*.29,.14,.21],[side*.23,.14,.65]],bronze,.005,false,28);for(const z of [-.65,-.29,.29,.66]){const x=side*(Math.abs(z)>.5?.235:.28);disk(g,'gothic edge jewel',x,.145,z,.016,.006,z<0?pink:cyan,8);}}
  propulsion(g,{metal:bronze,dark:core,light:edge},{centers:[[-.145,-.56],[.145,-.56],[-.15,.62],[.15,.62]],radius:.071,y:-.089});
  for(const side of [-1,1]){slab(g,'keel flange',polygon([[side*.1,-.66],[side*.19,-.35],[side*.2,.66],[side*.12,.82]]),core,-.057,.055,.008,2);}
  return anchors(g,{tailZ:.88,tailX:.14,footY:.140});
}

function razorBloom(){
  const g=root('razor-bloom');
  const obsidian=mat('Bloom / obsidian ceramic','#171420',.72,.21),chrome=mat('Bloom / sharpened chromium','#a7afc7',.97,.19),ink=mat('Bloom / satin black','#0e0e17',.25,.44),rubber=mat('Bloom / soft traction','#26202b',.06,.86),rose=mat('Bloom / rose metal','#9d255a',.87,.26),pink=glow('Bloom / hot fuchsia light','#fd237e',1.30),pale=glow('Bloom / petal tips','#f88bbf',.46);
  const outline=[[0,-1.14],[.095,-.98],[.18,-.56],[.31,-.72],[.395,-.65],[.285,-.29],[.26,.42],[.35,.75],[.27,.89],[.095,.73],[0,.96],[-.095,.73],[-.27,.89],[-.35,.75],[-.26,.42],[-.285,-.29],[-.395,-.65],[-.31,-.72],[-.18,-.56],[-.095,-.98]];
  const s=polygon(outline);slab(g,'sharpened split wing chassis',s,chrome,.087,.095,.012,2);const top=slab(g,'floating obsidian deck',s,obsidian,.123,.053,.015,3);top.scale.set(.948,1,.97);
  // Genuine open side wing windows leave an airy, blade-like silhouette.
  for(const side of [-1,1]){
    const wing=polygon([[side*.17,-.55],[side*.29,-.86],[side*.44,-.70],[side*.32,-.25],[side*.24,.08]]);
    const hole=new THREE.Path();hole.moveTo(side*.255,-.49);hole.lineTo(side*.341,-.678);hole.lineTo(side*.30,-.70);hole.closePath();wing.holes.push(hole);
    const blade=slab(g,'pierced swept side blade',wing,ink,.054,.039,.009,2);blade.rotation.z=-side*.10;
    trace(g,'blade cutting light',[[side*.20,.083,-.54],[side*.30,.083,-.79],[side*.405,.083,-.69],[side*.30,.083,-.27]],pink,.006,false,27);
    trace(g,'aft blade seam',[[side*.23,.1,.44],[side*.32,.1,.74],[side*.27,.1,.84],[side*.11,.1,.70]],rose,.007,false,24);
  }
  // An eight-petal sculpted metal blossom, each petal proud of its dark recess.
  disk(g,'bloom circular plinth',0,.147,-.015,.202,.017,ink,40);
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4+.16,petal=new THREE.Shape();petal.moveTo(0,0);petal.bezierCurveTo(-.075,-.08,-.072,-.19,0,-.235);petal.bezierCurveTo(.071,-.19,.074,-.08,0,0);petal.closePath();const p=slab(g,'razor petal '+i,petal,i%2===0?rose:chrome,.159,.013,.003,2);p.rotation.y=a;p.position.z=-.015;
    trace(g,'pink petal vein',[[0,.178,0],[Math.sin(a)*-.08,.179,Math.cos(a)*-.08],[Math.sin(a)*-.187,.179,Math.cos(a)*-.187]],pink,.004,false,14).position.z=-.015;
  }
  disk(g,'bloom core',0,.183,-.015,.044,.018,pink,12);ring(g,'black centre annulus',0,.194,-.015,.046,.004,ink,Math.PI*2,24);
  for(const z of [-.43,.42]){grip(g,'split hex grip',0,z,.37,.225,rubber,.15);for(const side of [-1,1]){slab(g,'grip angular flank',polygon([[side*.205,z-.105],[side*.237,z-.078],[side*.237,z+.078],[side*.205,z+.105]]),rose,.144,.009,.002,1);screw(g,side*.20,z,chrome,.16,.010);}}
  strip(g,'nose razor spine',[[0,-1.06],[0,-.77],[0,-.58]],.017,pink,.143);strip(g,'tail razor spine',[[0,.59],[0,.80],[0,.91]],.014,pink,.141);
  propulsion(g,{metal:chrome,dark:ink,light:pink},{centers:[[-.125,.62],[.125,.62],[0,-.71]],radius:.082,y:-.077});
  for(const side of [-1,1]){trace(g,'underside arcing stabilizer',[[side*.13,-.06,-.66],[side*.205,-.13,-.16],[side*.19,-.11,.5]],rose,.015,false,24);}
  return anchors(g,{tailZ:.78,tailX:.23});
}

function midnightKoi(){
  const g=root('midnight-koi');
  const pearl=mat('Koi / cultured pearl','#d5e3e1',.27,.22,{iridescence:.55,iridescenceIOR:1.34}),cobalt=mat('Koi / cobalt lacquer','#163856',.66,.22),navy=mat('Koi / deep blue enamel','#122237',.76,.26),gold=mat('Koi / old gold inlay','#d6ac61',.92,.29),rubber=mat('Koi / blue graphite traction','#25323d',.09,.76),cyan=glow('Koi / blue ion water','#38c9ea',1.2),coral=mat('Koi / coral accent','#dc6c57',.40,.30),white=mat('Koi / ivory inlay','#e9e7d7',.16,.28);
  const s=new THREE.Shape();s.moveTo(-.04,-1.115);s.bezierCurveTo(.17,-1.00,.31,-.67,.33,-.26);s.bezierCurveTo(.35,.20,.28,.56,.18,.76);s.bezierCurveTo(.24,.89,.26,1.02,.20,1.09);s.bezierCurveTo(.11,1.01,.045,.88,.01,.80);s.bezierCurveTo(-.055,.93,-.17,1.06,-.25,1.04);s.bezierCurveTo(-.28,.94,-.21,.79,-.16,.72);s.bezierCurveTo(-.31,.48,-.35,.04,-.32,-.34);s.bezierCurveTo(-.31,-.72,-.20,-1.02,-.04,-1.115);s.closePath();
  slab(g,'flowing pearl hull',s,pearl,.108,.115,.023,3);const under=slab(g,'cobalt underside chine',s,cobalt,-.018,.032,.012,2);under.scale.set(.98,1,.985);rim(g,'gold gunwale',s,.113,gold,.0065);const r=rim(g,'waterline ion seam',s,.003,cyan,.005);r.scale.set(.985,1,.987);
  // Irregular lacquer river cuts diagonally through the pearl top.
  const river=new THREE.Shape();river.moveTo(-.08,-1.005);river.bezierCurveTo(.19,-.72,.05,-.45,.10,-.18);river.bezierCurveTo(.23,.15,-.20,.39,.015,.76);river.lineTo(-.095,.78);river.bezierCurveTo(-.32,.41,.10,.13,-.035,-.17);river.bezierCurveTo(-.17,-.49,.09,-.68,-.15,-.93);river.closePath();slab(g,'cobalt river inlay',river,cobalt,.137,.005,.0015,1);rim(g,'river fine gold border',river,.14,gold,.003);
  // Cut-metal fish silhouettes. Two opposing koi form an open yin-yang figure.
  function fish(x,z,angle,body,tail){const f=new THREE.Group();f.position.set(x,0,z);f.rotation.y=angle;g.add(f);const shape=new THREE.Shape();shape.moveTo(0,-.28);shape.bezierCurveTo(.105,-.245,.13,-.055,.035,.17);shape.lineTo(.105,.28);shape.lineTo(0,.245);shape.lineTo(-.092,.285);shape.lineTo(-.031,.165);shape.bezierCurveTo(-.10,-.045,-.085,-.22,0,-.28);shape.closePath();slab(f,'swimming koi inlay',shape,body,.149,.004,.002,2);inlayOutline(f,'koi gold silhouette inlay',shape,.0052,gold,.152,90);disk(f,'koi eye',-.028,.156,-.20,.009,.004,navy,10);disk(f,'koi eye glint',-.029,.159,-.201,.003,.002,white,8);strip(f,'koi back line',[[0,-.17],[.018,-.05],[.008,.10],[0,.18]],.005,gold,.155);for(let row=0;row<6;row++){for(let col=-1;col<=1;col++){arcStrip(f,'inlaid fish scale',col*.036+(row%2?.014:0),-.13+row*.046,.027,.08,Math.PI-.08,.003,gold,.155,9);}}slab(f,'koi side fin',polygon([[.064,-.03],[.14,.04],[.067,.065]]),tail,.152,.003,.001,1);return f;}
  fish(-.085,-.06,-.31,white,coral);fish(.125,.09,Math.PI-.42,cobalt,gold);
  // Fine wave cuts visibly follow the shaped nose and tail.
  for(let i=0;i<6;i++){const x=-.20+i*.07;const pts=[];for(let j=0;j<18;j++){let z=-.89+j*.013;pts.push([x+.022*Math.sin(j*.24+i*.3),z]);}strip(g,'nose wave engraving',pts,.0045,i%2?gold:cobalt,.143);}
  for(const side of [-1,1]){trace(g,'forked tail gilding',[[side*.10,.142,.69],[side*.14,.142,.83],[side*.21,.142,.99]],gold,.006,false,18);}
  grip(g,'front pearl-surrounded grip',-.02,-.47,.38,.22,rubber,.143,.08);grip(g,'rear pearl-surrounded grip',.005,.45,.37,.21,rubber,.143,-.12);for(const z of [-.47,.46])for(const x of [-.245,.245])screw(g,x,z,gold,.15,.011);
  propulsion(g,{metal:gold,dark:navy,light:cyan},{centers:[[-.15,-.47],[.15,-.47],[-.135,.5],[.135,.5]],radius:.068,y:-.103});
  const keel=slab(g,'fish belly skeg',polygon([[-.018,-.77],[.018,-.77],[.048,.55],[0,.75],[-.048,.55]]),navy,-.063,.056,.008,2);trace(g,'keel light',[[0,-.13,-.67],[0,-.14,.05],[0,-.13,.64]],cyan,.006,false,24);
  return anchors(g,{tailZ:.91,tailX:.16,footY:.150});
}

function ghostOrchid(){
  const g=root('ghost-orchid');
  const porcelain=mat('Orchid / pearl porcelain','#e7e9e5',.12,.23,{iridescence:.28,iridescenceIOR:1.3}),ivory=mat('Orchid / lavender ceramic edge','#999cc5',.40,.31),silver=mat('Orchid / palladium','#adb7c9',.96,.23),dark=mat('Orchid / dark lavender recess','#343345',.53,.38),rubber=mat('Orchid / pale inset traction','#a6afb9',.06,.84),violet=glow('Orchid / ultraviolet capillary','#ac87f1',1.10),mint=glow('Orchid / mint stamen','#9ce9df',1.0);
  const s=new THREE.Shape();s.moveTo(0,-1.09);s.bezierCurveTo(.19,-1.035,.245,-.85,.255,-.65);s.bezierCurveTo(.27,-.40,.315,-.24,.32,.02);s.bezierCurveTo(.325,.30,.25,.63,.15,.77);s.lineTo(.07,.89);s.lineTo(0,.81);s.lineTo(-.07,.89);s.lineTo(-.15,.77);s.bezierCurveTo(-.25,.63,-.325,.30,-.32,.02);s.bezierCurveTo(-.315,-.24,-.27,-.4,-.255,-.65);s.bezierCurveTo(-.245,-.85,-.19,-1.035,0,-1.09);s.closePath();
  slab(g,'organic porcelain deck',s,porcelain,.116,.094,.024,4);const under=slab(g,'recessed silver substrate',s,silver,.006,.035,.015,2);under.scale.set(.947,1,.972);rim(g,'porcelain edge shadow seam',s,.058,ivory,.0055);
  // Recessed lavender capillaries leave wide, usable standing pads.
  for(const side of [-1,1]){trace(g,'lavender edge capillary',[[side*.08,.143,-.96],[side*.197,.143,-.65],[side*.258,.143,-.19],[side*.258,.143,.24],[side*.15,.143,.66]],violet,.0055,false,40);trace(g,'palladium capillary surround',[[side*.093,.139,-.95],[side*.211,.139,-.65],[side*.273,.139,-.19],[side*.273,.139,.24],[side*.165,.139,.66]],silver,.004,false,40);}
  // The central orchid is a shallow sculpted inlay with swept 3D petals.
  const centre=new THREE.Group();centre.position.set(0,.144,-.015);g.add(centre);
  disk(centre,'recessed orchid shadow well',0,.003,0,.212,.008,dark,40);
  ring(centre,'opal orchid mounting ring',0,.008,0,.210,.004,violet,Math.PI*2,40);
  for(let i=0;i<5;i++){
    const a=i*Math.PI*2/5;const ps=new THREE.Shape();ps.moveTo(0,0);ps.bezierCurveTo(-.078,-.045,-.121,-.16,-.036,-.224);ps.bezierCurveTo(.038,-.265,.117,-.15,.07,-.055);ps.quadraticCurveTo(.035,-.007,0,0);ps.closePath();const p=slab(centre,'porcelain orchid petal',ps,i%2?ivory:porcelain,.017,.013,.006,3);p.rotation.y=a;p.rotation.x=.045;const border=rim(centre,'lilac petal outline',ps,.025,violet,.0035,30);border.rotation.y=a;border.rotation.x=.045;const t=trace(centre,'orchid violet vein',[[0,.031,0],[Math.sin(a)*-.065,.032,Math.cos(a)*-.065],[Math.sin(a)*-.18,.032,Math.cos(a)*-.18]],violet,.0038,false,13);
  }
  disk(centre,'orchid heart deep setting',0,.033,0,.055,.015,dark,24);ellipsoid(centre,'orchid heart pearl',mint,0,.042,0,.035,.022,.042);ring(centre,'heart silver collar',0,.033,0,.042,.004,silver,Math.PI*2,22);
  grip(g,'front pale traction panel',0,-.45,.34,.235,rubber,.15);grip(g,'rear pale traction panel',0,.43,.35,.22,rubber,.15);for(const z of [-.45,.43])for(const x of [-.224,.224])screw(g,x,z,silver,.147,.010);
  // A five-piece orchid tail gives this board a unique open, sculptural silhouette.
  for(const [x,z,a,len,w,lift]of [[0,.88,0,.30,.12,.00],[-.13,.78,-.67,.29,.115,.02],[.13,.78,.67,.29,.115,.02],[-.22,.66,-1.02,.235,.09,-.015],[.22,.66,1.02,.235,.09,-.015]]){
    const pshape=new THREE.Shape();pshape.moveTo(0,0);pshape.bezierCurveTo(-w,.06,-w*.65,len*.80,0,len);pshape.bezierCurveTo(w*.65,len*.80,w,.06,0,0);pshape.closePath();const pgroup=new THREE.Group();pgroup.position.set(x,.012+lift,z);pgroup.rotation.y=a;pgroup.rotation.x=-.25;g.add(pgroup);slab(pgroup,'open orchid tail petal',pshape,porcelain,.015,.035,.009,3);trace(pgroup,'tail petal silver rib',[[0,.029,.02],[0,.031,len*.48],[0,.028,len*.92]],silver,.0037,false,16);trace(pgroup,'tail petal ion vein',[[0,-.025,.025],[0,-.025,len*.55],[0,-.026,len*.90]],violet,.0045,false,16);
  }
  propulsion(g,{metal:silver,dark,light:mint},{centers:[[-.14,-.58],[.14,-.58],[-.14,.50],[.14,.50]],radius:.065,y:-.078});
  for(const side of [-1,1]){const fin=polygon([[side*.20,-.34],[side*.37,-.05],[side*.36,.30],[side*.235,.46]]);slab(g,'underside petal stabilizer',fin,porcelain,-.035,.035,.013,3);trace(g,'stabilizer lavender lip',[[side*.23,-.035,-.25],[side*.35,-.035,.0],[side*.33,-.035,.27],[side*.24,-.035,.39]],violet,.005,false,24);}
  return anchors(g,{tailZ:.94,tailX:.16});
}

export function createArtBoard(id){switch(id){case 'stained-saint':return stainedSaint();case 'razor-bloom':return razorBloom();case 'midnight-koi':return midnightKoi();case 'ghost-orchid':return ghostOrchid();default:throw new Error('Unknown art hoverboard: '+id);}}
