import * as THREE from 'three';

/** Original, authored hoverboard geometry. Metres, +Y up, -Z forward. */
export const SPEED_BOARDS = [
  { id: 'afterburn', name: 'Afterburn', subtitle: 'Cherry lacquer / twin-turbine hot rod', color: '#ff6538', accent: '#ff6538', trail: 'Braided fire and hot embers', description: 'A split-nose hot rod with cherry lacquer, chrome knife rails, flame inlays and exposed twin turbines.' },
  { id: 'deep-cut', name: 'Deep Cut', subtitle: 'Smoked chrome / vinyl drive', color: '#65ffb4', accent: '#65ffb4', trail: 'Traveling waveform and equalizer pulses', description: 'A smoked-metal music machine with vinyl turbine platters, an enamel waveform and machined controls.' },
  { id: 'lovebite', name: 'Lovebite', subtitle: 'Candy enamel / heartbreaker', color: '#ff5f9e', accent: '#ff5f9e', trail: 'Fractured hearts and electric pink', description: 'Heart-cleft candy bodywork, blush-metal fins, a raised gold zipper and a ruby heart drive underneath.' },
  { id: 'dead-channel', name: 'Dead Channel', subtitle: 'Offset armor / signal interference', color: '#cbff36', accent: '#cbff36', trail: 'Broken pixels and angular interference', description: 'An asymmetric stealth deck of overlapping armor, signal-green channels and inset cyan circuitry.' }
];

function material(name, color, metalness = .5, roughness = .3, extra = {}) {
  const m = new THREE.MeshPhysicalMaterial({color, metalness, roughness, clearcoat: .42, clearcoatRoughness: .23, ...extra});
  m.name = name;
  return m;
}
function glow(name, color, intensity=1.25) {
  return material(name, color, .25, .24, {emissive:color, emissiveIntensity:intensity, clearcoat:.7});
}
function mesh(group, name, geometry, mat, position=[0,0,0], rotation=[0,0,0]) {
  const o = new THREE.Mesh(geometry,mat);o.name=name;o.position.set(...position);o.rotation.set(...rotation);o.castShadow=true;o.receiveShadow=true;group.add(o);return o;
}
function contour(points) {
  const s=new THREE.Shape();points.forEach((p,i)=>i?s.lineTo(p[0],-p[1]):s.moveTo(p[0],-p[1]));s.closePath();return s;
}
function path() {
  const s=new THREE.Shape();
  return {s,m(x,z){s.moveTo(x,-z);return this},l(x,z){s.lineTo(x,-z);return this},c(a,b,c,d,e,f){s.bezierCurveTo(a,-b,c,-d,e,-f);return this},q(a,b,c,d){s.quadraticCurveTo(a,-b,c,-d);return this},close(){s.closePath();return s}};
}
function plate(g,name,s,y,d,m,b=.014,scale=1) {
  const geo=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:b>0,bevelSize:b,bevelThickness:b*.65,bevelSegments:2,curveSegments:10,steps:1});
  geo.rotateX(-Math.PI/2);geo.scale(scale,1,scale);return mesh(g,name,geo,m,[0,y,0]);
}
function box(g,name,w,h,d,m,x=0,y=0,z=0,ry=0) {
  return mesh(g,name,new THREE.BoxGeometry(w,h,d),m,[x,y,z],[0,ry,0]);
}
function ringY(g,name,r,t,m,x,y,z,segments=40) {
  return mesh(g,name,new THREE.TorusGeometry(r,t,5,segments),m,[x,y,z],[-Math.PI/2,0,0]);
}
function ringZ(g,name,r,t,m,x,y,z) {
  return mesh(g,name,new THREE.TorusGeometry(r,t,5,32),m,[x,y,z]);
}
function discY(g,name,r,h,m,x,y,z,segments=40) {
  return mesh(g,name,new THREE.CylinderGeometry(r,r,h,segments,1),m,[x,y,z]);
}
function line(g,name,pts,r,m) {
  const curve=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));
  return mesh(g,name,new THREE.TubeGeometry(curve,Math.max(8,pts.length*5),r,5,false),m);
}
function roundedRect(w,d,r=Math.min(w,d)*.2) {
  return path().m(-w/2+r,-d/2).l(w/2-r,-d/2).q(w/2,-d/2,w/2,-d/2+r).l(w/2,d/2-r).q(w/2,d/2,w/2-r,d/2).l(-w/2+r,d/2).q(-w/2,d/2,-w/2,d/2-r).l(-w/2,-d/2+r).q(-w/2,-d/2,-w/2+r,-d/2).close();
}
function pad(g,name,x,z,w,d,mat,linesMat,rot=0) {
  const p=plate(g,name,roundedRect(w,d,.035),.115,.014,mat,.005);p.position.x=x;p.position.z=z;p.rotation.y=rot;
  const detail=new THREE.Group();detail.position.set(x,.137,z);detail.rotation.y=rot;g.add(detail);
  for(let i=-3;i<=3;i++)box(detail,name+' siping '+i,w*.80,.002,.008,linesMat,0,0,i*d*.105);
  return p;
}
function bolt(g,x,y,z,metal,black) {
  discY(g,'Titanium fastener',.016,.006,metal,x,y,z,8);
  box(g,'Fastener slot',.016,.001,.003,black,x,y+.004,z,.55);
}
function finish(g,id,width=.68,length=2.12) {
  g.name=id;g.userData={...g.userData,id,forward:'-Z',up:'+Y',units:'meters',nominalWidth:width,nominalLength:length,deckHeight:.14};
  for(const [n,p] of [['trail_left',[-.18,-.12,.90]],['trail_right',[.18,-.12,.90]],['foot_front',[0,.14,-.32]],['foot_back',[0,.14,.32]]]) {const a=new THREE.Object3D();a.name=n;a.position.set(...p);g.add(a);}
  return g;
}
function turbine(g,x,y,z,r,body,metal,dark,light,scale=1) {
  const h=.34*scale;
  mesh(g,'Tapered turbine shroud',new THREE.CylinderGeometry(r*.79,r,h,24,1),body,[x,y,z-h*.5],[Math.PI/2,0,0]);
  ringZ(g,'Machined exhaust lip',r,.012,metal,x,y,z+.006);
  mesh(g,'Exhaust cavity',new THREE.CircleGeometry(r*.89,28),dark,[x,y,z+.008]);
  ringZ(g,'Ion injector ring',r*.71,.009,light,x,y,z+.012);
  mesh(g,'Turbine spindle',new THREE.ConeGeometry(r*.25,.07,14),metal,[x,y,z+.008],[Math.PI/2,0,0]);
  for(let i=0;i<9;i++) {
    const a=i*Math.PI*2/9;
    const vane=new THREE.Mesh(new THREE.BoxGeometry(.014,r*.53,.016),metal);
    vane.position.set(x+Math.sin(a)*r*.53,y+Math.cos(a)*r*.53,z+.006);vane.rotation.z=-a+.32;vane.name='Swept exhaust vane';g.add(vane);
  }
}

function afterburn() {
  const g=new THREE.Group();
  const black=material('Afterburn • black ceramic',0x12151d,.46,.28);
  const carbon=material('Afterburn • charcoal grip',0x181823,.1,.77,{clearcoat:.1});
  const red=material('Afterburn • cherry lacquer',0xa50b24,.54,.23,{clearcoat:1,clearcoatRoughness:.11});
  const bright=material('Afterburn • scarlet enamel',0xed2941,.37,.26,{clearcoat:1});
  const chrome=material('Afterburn • brushed chrome',0xcbd9e4,.93,.22);
  const gold=material('Afterburn • champagne brass',0xffb958,.8,.23);
  const fire=glow('Afterburn • amber ceramic emitter',0xff5b16,1.5);
  const sole=glow('Afterburn • yellow core',0xffc345,1.7);
  const s=path().m(0,-.83).c(.055,-.88,.045,-1.045,.153,-1.04).c(.246,-1.035,.286,-.938,.258,-.785).l(.23,-.59).c(.303,-.25,.31,.40,.251,.717).l(.182,.995).q(.14,1.025,.098,.965).l(0,.802).l(-.098,.965).q(-.14,1.025,-.182,.995).l(-.251,.717).c(-.31,.4,-.303,-.25,-.23,-.59).l(-.258,-.785).c(-.286,-.938,-.246,-1.035,-.153,-1.04).c(-.045,-1.045,-.055,-.88,0,-.83).close();
  plate(g,'Ceramic monocoque',s,-.115,.09,black,.022,.99);
  plate(g,'Continuous chrome knife rail',s,-.029,.026,chrome,.012,1.025);
  plate(g,'Cherry coachwork',s,-.005,.10,red,.025,.99);
  const inset=path().m(0,-.72).c(.075,-.75,.115,-.84,.185,-.85).l(.174,-.55).c(.238,-.20,.24,.32,.194,.64).l(0,.76).l(-.194,.64).c(-.24,.32,-.238,-.2,-.174,-.55).l(-.185,-.85).c(-.115,-.84,-.075,-.75,0,-.72).close();
  plate(g,'Central red pearl fairing',inset,.10,.009,bright,.006);
  for(const sign of [-1,1]) {
    const flame=path().m(sign*.255,.63).c(sign*.223,.36,sign*.297,.17,sign*.243,-.04).c(sign*.225,-.13,sign*.206,-.21,sign*.227,-.34).c(sign*.16,-.2,sign*.175,.025,sign*.14,.105).c(sign*.145,-.135,sign*.103,-.365,sign*.087,-.54).c(sign*.036,-.22,sign*.109,.025,sign*.108,.25).c(sign*.081,.11,sign*.045,.12,sign*.026,.04).c(sign*.06,.36,sign*.13,.56,sign*.255,.63).close();
    plate(g,'Gold hand-cut flame inlay',flame,.115,.004,gold,.001);
    const orange=path().m(sign*.229,.57).c(sign*.19,.30,sign*.237,.18,sign*.219,.05).c(sign*.182,.19,sign*.16,.11,sign*.129,-.15).c(sign*.11,.18,sign*.143,.43,sign*.229,.57).close();
    plate(g,'Amber flame center',orange,.12,.003,fire,.001);
    turbine(g,sign*.286,-.10,.83,.102,red,chrome,black,fire);
    box(g,'Nacelle suspension',.12,.055,.18,black,sign*.22,-.08,.55);
    line(g,'Side running-light channel',[[sign*.249,-.046,-.56],[sign*.293,-.046,-.12],[sign*.289,-.046,.3],[sign*.244,-.046,.64]],.008,fire);
    for(const z of [-.64,.66])bolt(g,sign*.15,.127,z,chrome,black);
  }
  pad(g,'Front chevron grip',0,-.32,.36,.27,carbon,black,-.1);
  pad(g,'Rear chevron grip',0,.29,.39,.28,carbon,black,.1);
  for(const sign of [-1,1]) {
    const vent=contour([[sign*.04,-.73],[sign*.105,-.80],[sign*.164,-.84],[sign*.145,-.62],[sign*.087,-.57]]);
    plate(g,'Nose intake inset',vent,.116,.008,black,.004);
    for(let i=0;i<4;i++)box(g,'Nose intake slat',.042,.008,.012,chrome,sign*(.092+i*.012),.133,-.64-i*.043,.2*sign);
  }
  ringY(g,'Underside lift reactor',.135,.018,chrome,0,-.137,-.18,32);
  discY(g,'Lift reactor ceramic',.114,.018,sole,0,-.145,-.18,28);
  for(let i=-2;i<=2;i++)box(g,'Cooling keel',.025,.044,.58,black,i*.042,-.137,.25);
  return finish(g,'afterburn',.80,2.12);
}

function deepCut() {
  const g=new THREE.Group();
  const hull=material('Deep Cut • smoked titanium',0x3b4655,.87,.3);
  const rim=material('Deep Cut • machined silver',0xadb9cc,.94,.2);
  const black=material('Deep Cut • vinyl black',0x0b1020,.51,.22,{clearcoat:.85});
  const grip=material('Deep Cut • charcoal rubber',0x161e27,.07,.78,{clearcoat:.05});
  const cyan=glow('Deep Cut • cyan signal',0x47f5ff,1.45);
  const green=glow('Deep Cut • lime signal',0xb0ff49,1.3);
  const white=material('Deep Cut • warm label enamel',0xe9efdf,.22,.41);
  const bronze=material('Deep Cut • brass contacts',0xb89760,.84,.24);
  const s=path().m(0,-1.015).c(.225,-1.015,.318,-.91,.33,-.72).l(.33,-.45).l(.285,-.35).l(.285,.35).l(.33,.45).l(.33,.72).c(.318,.91,.225,1.015,0,1.015).c(-.225,1.015,-.318,.91,-.33,.72).l(-.33,.45).l(-.285,.35).l(-.285,-.35).l(-.33,-.45).l(-.33,-.72).c(-.318,-.91,-.225,-1.015,0,-1.015).close();
  plate(g,'Anodized turntable chassis',s,-.11,.12,hull,.022);
  plate(g,'Machined edge band',s,.006,.035,rim,.008,.985);
  plate(g,'Black enamel top panel',s,.037,.066,black,.018,.965);
  for(const z of [-.71,.71]) {
    discY(g,'Recessed platter well',.252,.016,hull,0,.112,z);
    ringY(g,'Platter rim chamfer',.239,.011,rim,0,.123,z);
    discY(g,'Vinyl turbine platter',.225,.014,black,0,.128,z);
    for(let i=0;i<5;i++)ringY(g,'Concentric record groove',.13+i*.019,.0025,hull,0,.138,z,48);
    discY(g,'Center paper label',.086,.005,z<0?cyan:green,0,.14,z,32);
    ringY(g,'Label border',.088,.005,bronze,0,.145,z,28);
    discY(g,'Machined spindle',.024,.022,rim,0,.148,z,12);
    for(let i=0;i<12;i++){const a=i*Math.PI/6;box(g,'Platter strobe tick',.013,.003,.026,white,Math.sin(a)*.209,.143,z+Math.cos(a)*.209,a);}
    // Swept pickup is raised off the platter, leaving the standing pads clear.
    line(g,'Tonearm',[[.238,.148,z+.15],[.198,.17,z+.105],[.124,.173,z+.05]],.009,rim);
    box(g,'Tonearm cartridge',.04,.018,.045,bronze,.123,.168,z+.046,-.4);
  }
  pad(g,'Front studio grip',0,-.305,.50,.225,grip,hull,-.06);
  pad(g,'Rear studio grip',0,.305,.50,.225,grip,hull,.06);
  const signal=plate(g,'Signal strip inset',roundedRect(.445,.23,.028),.108,.010,hull,.004);
  const values=[.025,.055,.086,.115,.058,.078,.13,.076,.044,.096,.063,.028];
  for(let i=0;i<12;i++){
    const x=-.198+i*.036;
    box(g,'Equalizer enamel bar',.018,.007,values[i],i<6?cyan:green,x,.129,0);
  }
  for(const sign of [-1,1]){
    for(let i=0;i<7;i++)box(g,'Lateral cooling channel',.009,.031,.063,black,sign*.302,-.015,-.31+i*.105);
    line(g,'Cyan edge trace',[[sign*.23,-.05,-.91],[sign*.329,-.05,-.72],[sign*.323,-.05,-.45],[sign*.279,-.05,-.30],[sign*.279,-.05,.30],[sign*.323,-.05,.45],[sign*.329,-.05,.72],[sign*.23,-.05,.91]],.007,cyan);
    for(const z of [-.47,.47])bolt(g,sign*.25,.116,z,rim,black);
  }
  for(const z of [-.66,.66]) {
    discY(g,'Underside magnetic driver',.18,.06,hull,0,-.14,z,32);
    ringY(g,'Driver field ring',.142,.011,green,0,-.176,z,32);
    discY(g,'Driver core',.108,.013,black,0,-.176,z,28);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;box(g,'Radial driver ribs',.021,.025,.076,bronze,Math.sin(a)*.122,-.176,z+Math.cos(a)*.122,a);}
  }
  for(let i=-2;i<=2;i++)box(g,'Underbody heat sink',.028,.045,.58,hull,i*.065,-.147,0);
  return finish(g,'deep-cut',.71,2.08);
}

function heartShape(w,h) {
  return path().m(0,h*.5).c(-w*.19,h*.29,-w*.54,-h*.02,-w*.50,-h*.25).c(-w*.47,-h*.5,-w*.15,-h*.54,0,-h*.26).c(w*.15,-h*.54,w*.47,-h*.5,w*.50,-h*.25).c(w*.54,-h*.02,w*.19,h*.29,0,h*.5).close();
}
function lovebite() {
  const g=new THREE.Group();
  const dark=material('Lovebite • midnight cherry',0x280c23,.54,.26);
  const pink=material('Lovebite • candy magenta',0xc91a69,.46,.23,{clearcoat:1,clearcoatRoughness:.09});
  const pearl=material('Lovebite • blush pink alloy',0xf2a1c7,.75,.25,{clearcoat:.85});
  const gold=material('Lovebite • champagne gold',0xf0c37c,.88,.22);
  const grip=material('Lovebite • plum rubber',0x220c29,.08,.8,{clearcoat:.08});
  const ruby=glow('Lovebite • ruby heart',0xff286b,1.4);
  const ice=glow('Lovebite • pink-white seam',0xff9bd7,1.1);
  const s=path().m(0,-.825).c(.06,-.95,.07,-1.035,.174,-1.025).c(.33,-1.005,.355,-.79,.325,-.65).c(.30,-.47,.23,-.21,.231,.03).c(.234,.30,.255,.49,.30,.70).l(.205,.99).q(.182,1.03,.125,.98).l(0,.84).l(-.125,.98).q(-.182,1.03,-.205,.99).l(-.30,.70).c(-.255,.49,-.234,.30,-.231,.03).c(-.23,-.21,-.30,-.47,-.325,-.65).c(-.355,-.79,-.33,-1.005,-.174,-1.025).c(-.07,-1.035,-.06,-.95,0,-.825).close();
  plate(g,'Burgundy structural shell',s,-.10,.105,dark,.022,.98);
  plate(g,'Rose-gold perimeter',s,.005,.026,gold,.010,1.005);
  plate(g,'Candy heart coachwork',s,.033,.073,pink,.026,.97);
  for(const sign of [-1,1]){
    const wing=path().m(sign*.233,.11).c(sign*.30,.38,sign*.365,.48,sign*.35,.71).l(sign*.261,.91).l(sign*.29,.69).c(sign*.243,.49,sign*.24,.34,sign*.233,.11).close();
    plate(g,'Blush swept tail fin',wing,-.003,.027,pearl,.009);
    const front=path().m(sign*.25,-.88).c(sign*.31,-.71,sign*.287,-.56,sign*.257,-.44).l(sign*.233,-.51).c(sign*.26,-.70,sign*.231,-.82,sign*.25,-.88).close();
    plate(g,'Heart-lobe blush inlay',front,.118,.003,pearl,.002);
    line(g,'Light seam',[[sign*.19,-.035,-.98],[sign*.328,-.035,-.75],[sign*.27,-.035,-.3],[sign*.232,-.035,.1],[sign*.282,-.035,.68],[sign*.18,-.035,.96]],.007,ice);
    for(const z of [-.45,.51])bolt(g,sign*.18,.124,z,gold,dark);
  }
  // The zipper sits between separated grip islands rather than under a foot.
  box(g,'Recessed zipper tape',.07,.008,1.23,dark,0,.115,.02);
  for(let i=0;i<27;i++){
    const z=-.57+i*.044;
    box(g,'Gold zipper tooth left',.036,.012,.014,gold,-.014,.13,z,-.16);
    box(g,'Gold zipper tooth right',.036,.012,.014,gold,.014,.13,z+.016,.16);
  }
  const slider=plate(g,'Zipper slider',roundedRect(.098,.118,.02),.136,.020,gold,.006);slider.position.z=.10;
  const pull=ringY(g,'Sculpted zipper pull',.056,.009,gold,0,.164,.19,28);pull.scale.x=.56;pull.rotation.x=-Math.PI/2+.2;
  for(const sign of [-1,1]){
    pad(g,'Front plum grip island',sign*.128,-.325,.16,.25,grip,dark,-sign*.10);
    pad(g,'Rear plum grip island',sign*.128,.36,.17,.265,grip,dark,sign*.07);
  }
  const jewel=plate(g,'Ruby nose heart',heartShape(.245,.225),.116,.016,ruby,.008);jewel.position.z=-.66;
  const goldHeart=plate(g,'Ruby setting',heartShape(.262,.24),.111,.005,gold,.005);goldHeart.position.z=-.66;
  for(const z of [-.28,.43]) {
    const foundation=plate(g,'Underside heart frame',heartShape(.29,.31),-.152,.033,gold,.008);foundation.position.z=z;
    const core=plate(g,'Ruby heart lift engine',heartShape(.24,.255),-.163,.022,ruby,.008);core.position.z=z;
  }
  for(const sign of [-1,1]){
    turbine(g,sign*.18,-.09,.90,.071,pearl,gold,dark,ruby,.75);
    line(g,'Underbody power loop',[[sign*.12,-.13,-.6],[sign*.17,-.145,-.2],[sign*.17,-.145,.4],[sign*.18,-.1,.77]],.013,dark);
  }
  return finish(g,'lovebite',.77,2.1);
}

function deadChannel() {
  const g=new THREE.Group();
  const dark=material('Dead Channel • dark ceramic',0x101721,.56,.34);
  const armor=material('Dead Channel • blue graphite',0x2a3646,.75,.30);
  const silver=material('Dead Channel • titanium edges',0x8ea0ad,.91,.28);
  const rubber=material('Dead Channel • graphite grip',0x0e151b,.05,.82,{clearcoat:.03});
  const lime=glow('Dead Channel • signal green',0xbcff2e,1.25);
  const cyan=glow('Dead Channel • cyan crystal',0x29d4e8,1.2);
  const enamel=material('Dead Channel • warning enamel',0xc7e658,.32,.46);
  const outline=contour([[-.235,-.98],[.075,-1.015],[.295,-.8],[.30,-.30],[.232,-.215],[.285,.13],[.255,.465],[.16,.515],[.168,.88],[-.055,1.0],[-.265,.865],[-.278,.37],[-.22,.22],[-.29,-.24]]);
  plate(g,'Offset armored monocoque',outline,-.115,.12,dark,.016);
  plate(g,'Exposed titanium layer',outline,.003,.021,silver,.006,.988);
  plate(g,'Recessed signal layer',outline,.025,.031,lime,.005,.968);
  const panels=[
    [[-.222,-.954],[.06,-.987],[.276,-.785],[.275,-.55],[.14,-.475],[-.235,-.55]],
    [[-.242,-.525],[.136,-.448],[.271,-.52],[.273,-.315],[.208,-.228],[.236,-.078],[-.232,-.145]],
    [[-.23,-.11],[.24,-.044],[.26,.13],[.236,.434],[.125,.486],[-.248,.347],[-.195,.218]],
    [[-.252,.392],[.126,.53],[.138,.863],[-.053,.967],[-.24,.843]]
  ];
  panels.forEach((p,i)=>plate(g,'Floating armor panel '+(i+1),contour(p),.062+i%2*.008,.04,i%2?armor:dark,.012));
  // Sideplates are intentionally offset, producing a recognizable asymmetric outline.
  plate(g,'Port signal blade',contour([[-.25,-.02],[-.37,.08],[-.37,.69],[-.285,.82],[-.29,.37],[-.25,.25]]),-.048,.06,armor,.012);
  plate(g,'Starboard signal blade',contour([[.273,-.84],[.365,-.72],[.35,-.29],[.29,-.16],[.296,-.4]]),-.026,.05,armor,.012);
  for(let i=0;i<6;i++){
    box(g,'Port blade vent',.025,.024,.037,dark,-.371,-.012,.21+i*.075);
    box(g,'Port blade indicator',.009,.014,.027,i<4?lime:cyan,-.387,-.006,.21+i*.075);
  }
  for(let i=0;i<4;i++){
    box(g,'Starboard plate indicator',.008,.016,.045,cyan,.358,.006,-.63+i*.085);
  }
  const frontPad=plate(g,'Front trapezoid grip',contour([[-.195,-.445],[.137,-.382],[.218,-.423],[.19,-.245],[-.191,-.29]]),.117,.014,rubber,.005);
  const backPad=plate(g,'Rear trapezoid grip',contour([[-.185,.22],[.19,.295],[.184,.43],[.103,.463],[-.22,.34]]),.117,.014,rubber,.005);
  for(let i=0;i<5;i++){
    box(g,'Front grip siping',.32,.003,.005,armor,-.005,.137,-.31-i*.022,-.14);
    box(g,'Rear grip siping',.32,.003,.005,armor,-.005,.137,.28+i*.023,-.18);
  }
  // Screen-printed caution chevrons represented as inlaid enamel surfaces.
  for(let i=0;i<3;i++){
    const z=-.875+i*.075;
    plate(g,'Nose hazard chevron',contour([[-.145,z],[.032,z+.03],[.147,z+.128],[.146,z+.15],[.02,z+.054],[-.145,z+.026]]),.118,.003,enamel,.001);
  }
  // Aligned circuitry follows the panel seam. Repeated square chips remain grounded.
  for(let i=0;i<8;i++){
    const x=-.185+i*.05,z=-.07+i*.01;
    box(g,'Cyan circuit tile',.031,.012,.039,cyan,x,.126,z);
    box(g,'Trace contact',.003,.003,.05,silver,x,.126,z+.045);
  }
  for(let i=0;i<4;i++){
    box(g,'Tail data stripe',.105-i*.012,.005,.018,i%2?cyan:lime,-.09+i*.015,.12,.66+i*.046,-.24);
  }
  for(const [x,z] of [[-.16,-.68],[.21,-.57],[-.18,.10],[.18,.16],[-.18,.77],[.075,.82]])bolt(g,x,.123,z,silver,dark);
  box(g,'Underbody central battery',.31,.09,.81,armor,0,-.16,.02);
  for(let i=-3;i<=3;i++)box(g,'Underside fin',.02,.05,.65,dark,i*.04,-.225,.01);
  turbine(g,-.163,-.12,.90,.078,armor,silver,dark,lime);
  turbine(g,.151,-.12,.72,.067,armor,silver,dark,cyan,.82);
  for(const sign of [-1,1])line(g,'External power bus',[[sign*.105,-.19,-.49],[sign*.21,-.18,-.30],[sign*.20,-.17,.45],[sign*.15,-.12,.65]],.010,cyan);
  return finish(g,'dead-channel',.78,2.07);
}

export function createSpeedBoard(id) {
  if(id==='afterburn')return afterburn();
  if(id==='deep-cut')return deepCut();
  if(id==='lovebite')return lovebite();
  if(id==='dead-channel')return deadChannel();
  throw new Error(`Unknown speed board: ${id}`);
}
