// Every purchased workshop capability changes a recognisable part of the car.
// Hidden meshes are authored once; buying/load only changes visibility/uniforms.
import * as THREE from 'three';

export function buildCarFittings({root,box,cylinder,tube,sphere,collect,flush,surfaces,extraMaterials,geometries}){
  const {chrome,dark,rubber,paint,warm}=surfaces,groups={};
  const group=id=>{const g=new THREE.Group();g.name='car-upgrade-'+id;g.visible=false;groups[id]=g;root.add(g);return g;};
  const starter=group('hotwire');
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
  const rebuilt=group('kept');
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
  flush();
  return{
    setOwned(ids){for(const [id,g]of Object.entries(groups))g.visible=ids.includes(id);},
    animate(charge,active,time=0){pips.forEach((p,i)=>{p.visible=charge>(i+.35)/8;});boostMat.color.setHex(active?0xb8f8ff:charge<.15?0xd68746:0x71cdda);flames.forEach((f,i)=>{f.visible=active;f.scale.y=.78+Math.sin(time*43+i)*.22;});},
  };
}
