// Every purchased workshop capability changes a recognisable part of the car.
// Hidden meshes are authored once; buying/load only changes visibility/uniforms.
import * as THREE from 'three';

export function buildCarFittings({root,box,cylinder,tube,sphere,collect,flush,surfaces,extraMaterials,geometries}){
  const {chrome,dark,rubber,paint,warm}=surfaces,groups={};
  const group=id=>{const g=new THREE.Group();g.name='car-upgrade-'+id;g.visible=false;groups[id]=g;root.add(g);return g;};
  const starter=group('hotwire');
  const armour=group('armour');
  for(const side of [-1,1]){
    box(side*1.01,.90,.36,.075,.49,1.94,dark,0,0,0,armour);
    box(side*1.057,1.14,.36,.026,.055,1.97,chrome,0,0,0,armour);
    for(const z of [-.5,-.1,.3,.7,1.1])for(const y of [.73,1.08])sphere(side*1.061,y,z,.018,.018,.018,chrome,armour);
    tube([[side*.94,.67,-1.52],[side*1.08,.62,-.7],[side*1.08,.62,1.33],[side*.92,.7,1.88]],.045,chrome,armour);
  }
  const ward=group('ward'),wardMat=new THREE.MeshStandardMaterial({color:0x183b48,emissive:0x59d4df,emissiveIntensity:.7,roughness:.28,metalness:.7});extraMaterials.push(wardMat);
  for(const side of [-1,1]){
    for(const z of [.16,.80])box(side*.52,2.12,z,.12,.18,.12,dark,0,0,0,ward);
    box(side*.52,2.20,.48,.25,.10,.82,dark,0,0,0,ward);
    for(let i=0;i<6;i++)collect(new THREE.TorusGeometry(.108,.018,8,20),chrome,side*.52,2.32,.18+i*.12,0,0,0,ward);
    cylinder(side*.52,2.32,.48,.061,.81,wardMat,Math.PI/2,0,ward);
    tube([[side*.52,2.2,.1],[side*.67,2.13,-.13],[side*.72,1.81,-.66]],.015,wardMat,ward);
  }
  cylinder(-.105,1.327,-1.013,.023,.012,chrome,Math.PI/2,0,starter);
  cylinder(-.105,1.327,-1.002,.016,.007,warm,Math.PI/2,0,starter);
  tube([[-.32,1.17,-.91],[-.30,1.08,-.84],[-.12,1.10,-.86],[-.105,1.27,-1.0]],.008,rubber,starter);
  const bar=group('rambar');
  for(const x of [-.45,.45]){
    tube([[x,.67,-2.12],[x,.68,-2.36],[x,1.14,-2.37],[x,1.19,-2.31]],.042,dark,bar);
    box(x,.74,-2.33,.12,.16,.09,chrome,0,0,0,bar);
    cylinder(x,.75,-2.391,.018,.015,chrome,Math.PI/2,0,bar);
  }
  tube([[-.94,.92,-2.22],[-.85,.95,-2.36],[0,.95,-2.38],[.85,.95,-2.36],[.94,.92,-2.22]],.044,chrome,bar);
  tube([[-.75,1.20,-2.26],[0,1.22,-2.36],[.75,1.20,-2.26]],.025,dark,bar);
  const nitro=group('nitro');
  const blue=new THREE.MeshStandardMaterial({color:0x164973,roughness:.30,metalness:.66});blue.name='car-nitro-enamel';extraMaterials.push(blue);
  for(const x of [-.29,.29]){
    cylinder(x,1.20,1.64,.105,.42,blue,0,0,nitro);sphere(x,1.41,1.64,.105,.055,.105,blue,nitro);sphere(x,.99,1.64,.105,.055,.105,blue,nitro);
    cylinder(x,1.485,1.64,.025,.06,chrome,0,0,nitro);box(x,1.514,1.64,.086,.015,.028,warm,0,0,0,nitro);
    for(const y of [1.07,1.30]){collect(new THREE.TorusGeometry(.108,.008,8,24),chrome,x,y,1.64,Math.PI/2,0,0,nitro);}
    tube([[x,1.48,1.66],[x+.12,1.46,1.80],[x+.13,.85,1.93],[x,.61,2.08]],.012,rubber,nitro);
    cylinder(x,.52,2.12,.049,.25,chrome,Math.PI/2,0,nitro);cylinder(x,.52,2.25,.037,.006,dark,Math.PI/2,0,nitro);
  }
  const boostPanel=new THREE.Group();boostPanel.name='car-nitro-gauge';boostPanel.position.set(.19,1.344,-1.057);boostPanel.rotation.x=-.20;nitro.add(boostPanel);
  box(0,0,0,.19,.052,.035,dark,0,0,0,boostPanel);
  const boostMat=new THREE.MeshBasicMaterial({color:0x71cdda});boostMat.name='car-nitro-charge';extraMaterials.push(boostMat);
  const pips=[];
  for(let i=0;i<8;i++){const g=new THREE.BoxGeometry(.015,.021,.004),m=new THREE.Mesh(g,boostMat);m.position.set(-.070+i*.020,0,.021);m.name='car-boost-charge-'+i;boostPanel.add(m);pips.push(m);geometries.push(g);}
  const fireMat=new THREE.MeshBasicMaterial({color:0x72c8eb,transparent:true,opacity:.68,depthWrite:false});fireMat.name='car-nitro-exhaust';extraMaterials.push(fireMat);
  const flames=[];for(const x of [-.29,.29]){const g=new THREE.ConeGeometry(.047,.34,16),m=new THREE.Mesh(g,fireMat);m.position.set(x,.52,2.38);m.rotation.x=Math.PI/2;m.visible=false;nitro.add(m);flames.push(m);geometries.push(g);}
  const rebuilt=group('rebuilt');
  // The rebuilt engine gains bright finned hardware through its bonnet vents,
  // clean trim and a proper caged touring roof basket.
  for(const x of [-.39,.39]){box(x,1.238,-1.47,.24,.035,.44,dark,0,0,0,rebuilt);for(let n=0;n<8;n++)box(x,1.262,-1.66+n*.051,.214,.012,.018,chrome,0,0,0,rebuilt);}
  for(const x of [-.62,.62])tube([[x,2.13,-.18],[x,2.24,-.13],[x,2.24,1.42],[x,2.13,1.49]],.024,chrome,rebuilt);
  for(const z of [-.13,1.42])tube([[-.62,2.14,z],[-.62,2.24,z],[.62,2.24,z],[.62,2.14,z]],.024,chrome,rebuilt);
  for(let i=0;i<9;i++)box(0,2.126,-.08+i*.18,1.22,.018,.025,dark,0,0,0,rebuilt);
  box(.19,2.205,.71,.60,.13,.77,rubber,0,0,0,rebuilt);for(const z of [.43,.98])box(.19,2.281,z,.61,.015,.03,chrome,0,0,0,rebuilt);
  const breaker=group('treebreaker');
  // A shallow splitter nose and stout diagonal braces physically read as forestry gear.
  for(const side of [-1,1]){
    tube([[side*.70,.53,-1.60],[side*.86,.61,-2.29],[side*.63,1.12,-2.40]],.055,dark,breaker);
    box(side*.52,.72,-2.41,.89,.33,.075,chrome,0,side*.19,0,breaker);
    for(let n=0;n<4;n++)box(side*(.18+n*.20),.63,-2.47,.075,.13,.065,dark,0,side*.19,.22*side,breaker);
    for(let n=0;n<4;n++)cylinder(side*(.22+n*.17),.80,-2.46,.013,.017,dark,Math.PI/2,0,breaker);
    tube([[side*.83,1.03,-2.31],[side*.75,1.66,-1.32],[side*.69,2.05,-.81]],.011,chrome,breaker);
  }

  /* ------------------------------------- THE ELEVEN REWIRE: four more parts -- */
  // Each of these arrives off a boss, so each has to read as SALVAGE — taken off a thing
  // and bolted on — rather than as catalogue kit. The working lamp is the left one
  // (x -.66); the dead one on the right stays dead unless REBUILT lights it.

  // STOLEN LIGHT, from the Lantern Eater: a deep cowl and a caged guard over the one lamp
  // you have, so nothing can take it off you again.
  const stolen=group('stolenlight');
  cylinder(-.66,1.02,-2.30,.166,.13,dark,Math.PI/2,0,stolen);
  collect(new THREE.TorusGeometry(.163,.020,10,36),chrome,-.66,1.02,-2.355,0,0,0,stolen);
  for(let n=0;n<7;n++){const a=n/6*Math.PI-Math.PI/2;box(-.66+Math.sin(a)*.128,1.02+Math.cos(a)*.128-.002,-2.372,.013,.013,.030,chrome,0,0,a,stolen);}
  for(let n=0;n<4;n++){const a=n/3*Math.PI*2;collect(new THREE.TorusGeometry(.150,.009,8,28),chrome,-.66,1.02,-2.30+n*.018,0,0,a,stolen);}
  tube([[-.66,1.16,-2.28],[-.60,1.22,-2.10],[-.44,1.21,-1.86]],.014,dark,stolen);

  // MOTH SCREEN, from the Moonmolt: a fine mesh disc standing a little proud of the lens,
  // with a ring that holds it off the glass. Sparse enough to see the lamp through.
  const screen=group('mothscreen');
  collect(new THREE.TorusGeometry(.126,.011,8,32),chrome,-.66,1.02,-2.262,0,0,0,screen);
  for(let k=-5;k<=5;k++){const h=Math.sqrt(Math.max(0,.122*.122-(k*.023)**2))*2;if(h>.01){box(-.66+k*.023,1.02,-2.268,.0035,h,.0035,chrome,0,0,0,screen);box(-.66,1.02+k*.023,-2.268,h,.0035,.0035,chrome,0,0,0,screen);}}
  for(const side of [-1,1])tube([[-.66+side*.124,1.02,-2.262],[-.66+side*.150,1.01,-2.205]],.008,dark,screen);

  // MIRE TYRES, from the Mire Bride. The wheels themselves are one InstancedMesh that car.js
  // poses every step, so the tread cannot live here — what lives here is everything ROUND
  // the wheels: wide arch flares, heavy mud flaps behind each one, and the spare strapped to
  // the tail, which is the part you actually see from outside the car.
  const tyres=group('miretyres');
  for(const side of [-1,1])for(const z of [-1.275,1.275]){
    for(let n=0;n<7;n++){const a=(-.34+n*.113)*Math.PI;box(side*.97,.40+Math.cos(a)*.505,z+Math.sin(a)*.505,.115,.055,.085,dark,0,0,0,tyres);}
    box(side*.96,.185,z+(z<0?-.50:.56),.20,.36,.028,rubber,.12,0,0,tyres);
    for(const x of [-.06,.06])cylinder(side*.96+x*side,.345,z+(z<0?-.495:.555),.012,.010,chrome,Math.PI/2,0,tyres);
  }
  collect(new THREE.TorusGeometry(.295,.115,10,26),dark,0,1.20,2.29,0,0,0,tyres);
  cylinder(0,1.20,2.29,.175,.075,chrome,Math.PI/2,0,tyres);
  for(let n=0;n<14;n++){const a=n/14*Math.PI*2;box(Math.sin(a)*.315,1.20+Math.cos(a)*.315,2.31,.070,.035,.055,dark,0,0,a,tyres);}
  for(const y of [1.02,1.38])tube([[-.30,y,2.20],[0,y,2.36],[.30,y,2.20]],.017,rubber,tyres);

  // FUNERAL PEAL, from the Bellwether: a small brass bell slung under the front bumper on a
  // yoke, with its clapper. It is `warm` so it catches the light and says where the sound
  // comes from without ever being a light itself.
  const peal=group('funeralpeal');
  const brass=new THREE.MeshStandardMaterial({color:0x8a6a33,emissive:0xffbe62,emissiveIntensity:.10,roughness:.34,metalness:.82});brass.name='car-peal-bell';extraMaterials.push(brass);
  for(const side of [-1,1])tube([[side*.17,.72,-2.02],[side*.20,.60,-2.09],[side*.115,.525,-2.13]],.016,dark,peal);
  cylinder(0,.516,-2.13,.038,.030,chrome,0,0,peal);
  for(let n=0;n<5;n++)cylinder(0,.496-n*.038,-2.13,.055+n*.029,.040,brass,0,0,peal);
  collect(new THREE.TorusGeometry(.176,.022,10,30),brass,0,.322,-2.13,Math.PI/2,0,0,peal);
  cylinder(0,.404,-2.13,.010,.115,dark,0,0,peal);
  sphere(0,.330,-2.13,.040,.040,.040,chrome,peal);

  flush();
  return{
    setOwned(ids){for(const [id,g]of Object.entries(groups))g.visible=ids.includes(id);},
    /** The bell brightens with the peal charge, so the hold has a face on the car itself. */
    pealCharge(k){brass.emissiveIntensity=.10+Math.max(0,Math.min(1,k))*1.25;},
    animate(charge,active,time=0,shield=3){wardMat.emissiveIntensity=.06+Math.max(0,shield)/3*(.85+.1*Math.sin(time*2));pips.forEach((p,i)=>{p.visible=charge>(i+.35)/8;});boostMat.color.setHex(active?0xb8f8ff:charge<.15?0xd68746:0x71cdda);flames.forEach((f,i)=>{f.visible=active;f.scale.y=.78+Math.sin(time*43+i)*.22;});},
  };
}
