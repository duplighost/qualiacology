(function(global){
  'use strict';

  const C = global.PotCore;

  const ENEMIES = {
    drifter:{name:'DRIFTER',r:23,hp:6,speed:136,damage:10,color:'#ff7898',accent:'#fff0f4',score:110,behavior:'chase'},
    glare:{name:'GLARE',r:25,hp:8,speed:78,damage:10,color:'#72c8ff',accent:'#eff9ff',score:150,behavior:'shooter'},
    latch:{name:'LATCH',r:31,hp:14,speed:88,damage:14,color:'#ffd166',accent:'#fff6cc',score:210,behavior:'charger'},
    murmur:{name:'MURMUR',r:22,hp:8,speed:104,damage:9,color:'#c69cff',accent:'#f6ecff',score:180,behavior:'orbiter'},
    misprint:{name:'MISPRINT',r:22,hp:9,speed:116,damage:11,color:'#68efdc',accent:'#effffb',score:240,behavior:'blink'},
    bossMisread:{name:'THE MISREAD',r:66,hp:132,speed:94,damage:15,color:'#ff6598',accent:'#fff0f6',score:4000,behavior:'bossMisread',boss:true},
    bossWeather:{name:'THE WEATHER',r:82,hp:198,speed:74,damage:17,color:'#79b4ff',accent:'#f1f7ff',score:7000,behavior:'bossWeather',boss:true}
  };

  const STAGES = [
    {
      id:'street',name:'RAIN STREET',kicker:'THE ROUTE BEGINS',bounds:{x:0,y:0,w:1080,h:850},center:{x:520,y:430},spawn:{x:170,y:350},entry:{x:170,y:350},
      palette:{ground:'#183035',road:'#101f29',edge:'#38575a',accent:'#67f1de',light:'#ffd27d',rain:'#9adfff'},weather:{rain:.86,wind:-.42,gust:.22,fog:.18},
      objective:'Survive long enough to read the bench.',
      care:{type:'bench',x:790,y:170,title:'REST STEP',copy:'Someone put this here because standing forever is bullshit.',verb:'restStep',key:'SHIFT',desc:'Perfect dashes restore clarity.'},
      waves:[
        [{type:'drifter',count:4},{type:'glare',count:2}],
        [{type:'drifter',count:3},{type:'latch',count:2}]
      ],
      gate:{x:1005,y:290,w:42,h:320},
      nextEntry:{x:1120,y:430}
    },
    {
      id:'house',name:'KEY HOUSE',kicker:'A PRIVATE DOOR',bounds:{x:1010,y:160,w:1160,h:1010},center:{x:1580,y:670},spawn:{x:1135,y:430},entry:{x:1120,y:430},
      palette:{ground:'#29483d',road:'#182d2a',edge:'#60705a',accent:'#ffbd66',light:'#ffecaa',rain:'#8ed7f2'},weather:{rain:.94,wind:-.3,gust:.18,fog:.15},
      objective:'Clear the yard. Find what was left under the pot.',
      care:{type:'pot',x:1240,y:810,title:'SHELTER PULSE',copy:'For anyone who needs out of the weather. Put it back when the weather learns manners.',verb:'shelterPulse',key:'E',desc:'Spend warmth to clear space.'},
      waves:[
        [{type:'drifter',count:3},{type:'glare',count:3},{type:'latch',count:1}],
        [{type:'murmur',count:3},{type:'latch',count:2}]
      ],
      gate:{x:2085,y:210,w:42,h:350},
      nextEntry:{x:2210,y:335}
    },
    {
      id:'alley',name:'CHIME ALLEY',kicker:'THE HOUSE SOUNDS ALIVE',bounds:{x:2070,y:-120,w:1160,h:860},center:{x:2640,y:310},spawn:{x:2210,y:335},entry:{x:2210,y:335},
      palette:{ground:'#20394a',road:'#101e2c',edge:'#49647b',accent:'#82ecff',light:'#ffdc91',rain:'#93ddff'},weather:{rain:1.02,wind:-.5,gust:.28,fog:.22},
      objective:'Make enough quiet to hear the chimes.',
      care:{type:'chimes',x:3030,y:160,title:'HARMONIC SHOT',copy:'The house wanted to sound alive even when nobody was home.',verb:'harmonicShot',key:'FIRE',desc:'Shots chain through nearby threats.'},
      waves:[
        [{type:'misprint',count:3},{type:'glare',count:3}],
        [{type:'murmur',count:4},{type:'drifter',count:4},{type:'latch',count:1}]
      ],
      gate:{x:3130,y:200,w:44,h:360},
      nextEntry:{x:3250,y:410}
    },
    {
      id:'roof',name:'THE MURAL ROOF',kicker:'SOMEBODY PAINTED THE USELESS THING',bounds:{x:3130,y:220,w:1190,h:930},center:{x:3720,y:690},spawn:{x:3260,y:420},entry:{x:3260,y:420},
      palette:{ground:'#352b4e',road:'#1d1a31',edge:'#735c88',accent:'#dfa0ff',light:'#ffd08a',rain:'#bdc7ff'},weather:{rain:1.08,wind:-.66,gust:.36,fog:.2},
      objective:'Kill the thing that keeps lying about where the attack is.',
      care:{type:'mural',x:4050,y:930,title:'COLOR READ',copy:'It did not keep anyone warm. They painted it anyway.',verb:'colorRead',key:'Q',desc:'Slow hostile time and reveal true tells.'},
      waves:[[{type:'bossMisread',count:1}]],
      gate:{x:4215,y:320,w:45,h:370},
      nextEntry:{x:4360,y:330},
      boss:'bossMisread'
    },
    {
      id:'flood',name:'THE FLOODWAY',kicker:'THE KEY IS ALREADY GONE',bounds:{x:4230,y:-140,w:1290,h:900},center:{x:4860,y:310},spawn:{x:4360,y:330},entry:{x:4360,y:330},
      palette:{ground:'#17434b',road:'#0c2c37',edge:'#3c7580',accent:'#65f0dc',light:'#ffd184',rain:'#7ee4ff'},weather:{rain:1.14,wind:-.38,gust:.3,fog:.28},
      objective:'Cross the flood. Find the note somebody already used.',
      care:{type:'note',x:5220,y:520,title:'SECOND STRANGER',copy:'The key is gone. Good. It worked.',verb:'secondStranger',key:'ECHO',desc:'Your last actions return beside you.'},
      optional:{type:'pie',x:4860,y:65,title:'STILL WARM',copy:'No objective. Somebody baked a pie.'},
      waves:[
        [{type:'misprint',count:4},{type:'murmur',count:4}],
        [{type:'latch',count:3},{type:'glare',count:4},{type:'drifter',count:4}]
      ],
      gate:{x:5410,y:220,w:44,h:380},
      nextEntry:{x:5545,y:480}
    },
    {
      id:'home',name:'THE LAST PORCH',kicker:'LEAVE IT ON',bounds:{x:5400,y:180,w:1450,h:1040},center:{x:6130,y:700},spawn:{x:5550,y:480},entry:{x:5550,y:480},
      palette:{ground:'#2c493c',road:'#192e28',edge:'#68745b',accent:'#ffc26d',light:'#fff0b5',rain:'#91dcf4'},weather:{rain:1.24,wind:-.7,gust:.48,fog:.34},
      objective:'Read the porch light before the weather notices you.',
      care:{type:'porchlight',x:6470,y:900,title:'HOME LIT',copy:'Leave it on.',verb:'homeLit',key:'LIGHT',desc:'Lit ground restores clarity. Once, it refuses your death.'},
      preCare:true,
      waves:[[{type:'bossWeather',count:1}]],
      boss:'bossWeather',
      finish:{x:6650,y:900}
    }
  ];

  const VERBS = {
    restStep:{title:'REST STEP',key:'SHIFT',desc:'Perfect dash → clarity'},
    shelterPulse:{title:'SHELTER PULSE',key:'E',desc:'35 warmth → clear space'},
    harmonicShot:{title:'HARMONIC SHOT',key:'FIRE',desc:'Bolts chain once'},
    colorRead:{title:'COLOR READ',key:'Q',desc:'Slow threats / true tells'},
    secondStranger:{title:'SECOND STRANGER',key:'ECHO',desc:'Your actions return'},
    homeLit:{title:'HOME LIT',key:'LIGHT',desc:'Lit ground restores you'}
  };

  const RANKS=[
    {rank:'D',score:0,name:'NOTICED'},
    {rank:'C',score:350,name:'SEEN'},
    {rank:'B',score:900,name:'READ'},
    {rank:'A',score:1900,name:'UNDERSTOOD'},
    {rank:'S',score:3300,name:'KEPT'}
  ];

  const TUTORIALS={
    move:'WASD moves. Mouse aims and fires. Your coat, your blade, your light — nothing is waiting behind a tutorial clerk.',
    moveTouch:'Left thumb moves. Drag the right side to aim and fire. The big blade button does exactly what it should.',
    blade:'SPACE swings the blade. It cuts bodies, fences, and bullets that have become too confident.',
    dash:'SHIFT dashes. Pass close enough to danger and REST STEP pays you back.',
    pulse:'E spends warmth on SHELTER PULSE when there is nothing nearby to read.',
    focus:'Q activates COLOR READ. The enemies slow down. You do not.',
    echo:'SECOND STRANGER repeats your shots and movement from a few seconds ago.'
  };

  function buildWorld(){
    const surfaces=[],walkables=[],ramps=[],walls=[],props=[],lights=[],destructibles=[],colliders=[];
    const s=(x,y,w,h,z,kind,stage)=>surfaces.push({x,y,w,h,z:z||0,kind,stage});
    const w=(x,y,wid,hei,kind,stage)=>walkables.push({x,y,w:wid,h:hei,kind,stage});
    const wall=(x,y,wid,hei,height,kind,stage,extra={})=>walls.push({x,y,w:wid,h:hei,height:height||70,kind:kind||'wall',stage,...extra});
    const prop=(type,x,y,z=0,stage=0,extra={})=>props.push({type,x,y,z,stage,...extra});
    const light=(x,y,z=55,r=230,color='#ffd08a',stage=0,extra={})=>lights.push({x,y,z,r,color,stage,...extra});
    const breakable=(x,y,wid,hei,hp,kind,stage)=>destructibles.push({x,y,w:wid,h:hei,height:58,hp,maxHp:hp,kind,stage,dead:false});

    // Stage 0: a wet street and bus stop.
    w(0,0,1080,850,'street',0); s(0,0,1080,850,0,'asphalt',0); s(0,0,1080,215,1,'sidewalk',0); s(0,655,1080,195,1,'sidewalk',0);
    wall(-55,-30,45,910,70,'fence',0); wall(0,-55,1080,45,70,'fence',0); wall(0,850,1080,45,70,'fence',0);
    wall(350,54,330,62,90,'busShelter',0); wall(350,54,28,235,90,'busShelter',0); wall(652,54,28,235,90,'busShelter',0);
    prop('bench',790,170,0,0,{care:true}); prop('busSign',302,208,0,0); prop('lamp',160,225,0,0); light(160,225,88,250,'#ffd48a',0); prop('lamp',905,620,0,0); light(905,620,88,260,'#ffd48a',0);
    prop('car',210,490,0,0,{rot:.05,color:'#244957'}); wall(130,430,235,110,62,'car',0); prop('car',680,475,0,0,{rot:-.07,color:'#4f2b35'}); wall(600,420,235,110,62,'car',0);
    prop('hydrant',505,690,0,0); prop('newspaper',455,335,1,0); prop('roadStripe',510,415,1,0,{length:270}); prop('stormDrain',75,610,1,0);
    for(let i=0;i<7;i++)prop('bollard',70+i*145,690,0,0);
    breakable(850,300,36,180,4,'fence',0); breakable(910,300,36,180,4,'fence',0);

    // Connector 0->1.
    w(980,300,250,300,'connector',0); s(980,300,250,300,0,'asphalt',0);

    // Stage 1: yard and a house that becomes a passage.
    w(1010,160,1160,1010,'yard',1); s(1010,160,1160,1010,0,'grass',1); s(1010,320,1160,310,1,'path',1);
    s(1320,420,580,500,4,'wood',1); prop('house',1605,670,4,1,{w:580,h:500,color:'#3c5148'});
    wall(1300,400,620,34,120,'houseWall',1); wall(1300,920,620,34,120,'houseWall',1); wall(1300,400,34,220,120,'houseWall',1); wall(1300,765,34,189,120,'houseWall',1); wall(1886,400,34,180,120,'houseWall',1); wall(1886,735,34,219,120,'houseWall',1);
    wall(1480,555,34,220,85,'insideWall',1); wall(1480,555,180,34,85,'insideWall',1); wall(1730,700,190,34,85,'insideWall',1);
    prop('pot',1240,810,0,1,{care:true}); prop('pot',1180,760,0,1); prop('pot',1210,885,0,1);
    prop('lamp',1115,270,0,1); light(1115,270,88,230,'#ffd68b',1); prop('porchLight',1335,685,55,1); light(1335,685,90,230,'#ffe3a0',1);
    prop('table',1680,620,4,1); prop('sofa',1760,835,4,1); prop('rug',1620,780,5,1);
    prop('mailbox',1135,850,0,1); prop('garden',1185,1010,0,1,{scale:1.1}); prop('downspout',1328,895,0,1);
    for(let i=0;i<5;i++)prop('tree',1120+i*205,1080,0,1,{scale:.8+((i%2)*.2)});
    breakable(1060,620,32,240,5,'fence',1); breakable(2010,650,32,230,5,'fence',1);

    // Connector 1->2.
    w(2050,220,260,330,'connector',1); s(2050,220,260,330,0,'path',1);

    // Stage 2: compressed alley with wind chimes.
    w(2070,-120,1160,860,'alley',2); s(2070,-120,1160,860,0,'alley',2); s(2110,30,1080,470,1,'wetStone',2);
    wall(2070,-120,1160,120,180,'building',2); wall(2070,620,1160,120,200,'building',2);
    for(let i=0;i<6;i++){prop('window',2180+i*175,-10,75,2,{lit:i%3===0});if(i%3===0)light(2180+i*175,-10,100,155,'#ffd27c',2);}
    for(let i=0;i<5;i++)prop('dumpster',2220+i*210,530,0,2,{rot:(i%2)*.08});
    wall(2200,500,145,72,72,'dumpster',2); wall(2630,500,145,72,72,'dumpster',2);
    prop('chimes',3030,160,95,2,{care:true}); light(3030,160,115,210,'#9deeff',2);
    prop('fireEscape',2810,40,0,2); prop('laundry',2480,120,100,2); prop('laundry',2580,120,100,2);
    prop('neonSign',3100,10,118,2,{text:'OPEN'}); prop('pipe',2335,55,0,2); prop('trashBag',2860,535,0,2); prop('stormDrain',2660,475,1,2);
    breakable(2430,165,30,245,4,'chainFence',2); breakable(2480,165,30,245,4,'chainFence',2);

    // Ramp up to roof.
    w(3090,210,260,340,'rampUp',2); s(3090,210,260,340,0,'ramp',2); ramps.push({x:3090,y:210,w:260,h:340,axis:'x',from:0,to:140});

    // Stage 3: a rooftop arena.
    w(3130,220,1190,930,'roof',3); s(3130,220,1190,930,140,'roof',3);
    wall(3130,220,1190,32,48,'parapet',3,{z:140}); wall(3130,1118,1190,32,48,'parapet',3,{z:140}); wall(3130,220,32,120,48,'parapet',3,{z:140}); wall(3130,585,32,565,48,'parapet',3,{z:140}); wall(4288,220,32,185,48,'parapet',3,{z:140}); wall(4288,680,32,470,48,'parapet',3,{z:140});
    prop('vent',3400,430,140,3); wall(3340,380,130,100,65,'vent',3,{z:140}); prop('vent',3890,560,140,3); wall(3830,510,130,100,65,'vent',3,{z:140});
    prop('waterTower',3600,900,140,3); wall(3515,825,170,150,140,'tower',3,{z:140});
    prop('mural',4050,930,145,3,{care:true}); light(4050,930,180,320,'#d79cff',3);
    prop('antenna',3250,1010,140,3); prop('antenna',4180,340,140,3);
    prop('satellite',4140,845,140,3); prop('roofPipe',3750,350,140,3); prop('roofPipe',3790,350,140,3);
    for(let i=0;i<7;i++)prop('roofLight',3240+i*150,280,155,3,{lit:i===0||i===6});

    // Ramp down.
    w(4190,330,270,350,'rampDown',3); s(4190,330,270,350,0,'ramp',3); ramps.push({x:4190,y:330,w:270,h:350,axis:'x',from:140,to:0});

    // Stage 4: flooded service route.
    w(4230,-140,1290,900,'flood',4); s(4230,-140,1290,900,0,'flood',4); s(4300,-40,1150,660,-4,'water',4);
    wall(4230,-140,1290,70,130,'building',4); wall(4230,690,1290,70,130,'building',4);
    prop('note',5220,520,4,4,{care:true}); prop('windowsill',4860,65,42,4); prop('pie',4860,65,45,4,{optional:true}); light(4860,65,95,190,'#ffd087',4);
    prop('drain',4470,400,0,4); prop('drain',5050,350,0,4); prop('lamp',5350,120,0,4); light(5350,120,88,250,'#ffd389',4);
    prop('barrel',4510,575,0,4); prop('umbrella',4940,560,0,4,{color:'#e5b45e'}); prop('warningSign',5410,590,0,4);
    wall(4660,110,210,80,65,'van',4); prop('van',4765,150,0,4,{color:'#2c4950'});
    for(let i=0;i<9;i++)prop('waterDebris',4340+i*125,520+(i%2)*55,0,4,{kind:i%3});
    breakable(5000,180,34,220,5,'fence',4); breakable(5060,180,34,220,5,'fence',4);

    // Connector 4->5.
    w(5390,230,260,360,'connector',4); s(5390,230,260,360,0,'path',4);

    // Stage 5: final yard, porch and house.
    w(5400,180,1450,1040,'home',5); s(5400,180,1450,1040,0,'grass',5); s(5400,360,1450,360,1,'path',5); s(6230,690,480,370,4,'porch',5);
    prop('finalHouse',6550,875,4,5,{w:560,h:540,color:'#3e5147'}); wall(6240,670,590,36,145,'houseWall',5); wall(6240,1060,590,36,145,'houseWall',5); wall(6794,670,36,426,145,'houseWall',5); wall(6240,670,36,190,145,'houseWall',5); wall(6240,970,36,126,145,'houseWall',5);
    prop('porchlight',6470,900,95,5,{care:true}); light(6470,900,125,360,'#ffe89d',5,{safe:true}); prop('porchlight',6310,780,95,5); light(6310,780,125,260,'#ffd984',5,{safe:true}); prop('porchlight',6700,775,95,5); light(6700,775,125,260,'#ffd984',5,{safe:true});
    prop('homeDoor',6650,900,5,5); prop('bench',5720,1050,0,5); prop('windChime',6090,740,105,5);
    prop('mailbox',5580,760,0,5); prop('umbrella',6130,820,4,5,{color:'#77cfe4'}); prop('garden',6030,1090,0,5,{scale:1.35}); prop('porchRail',6265,710,4,5,{length:360});
    for(let i=0;i<6;i++)prop('tree',5510+i*220,1120-(i%2)*80,0,5,{scale:.9+(i%3)*.1});
    breakable(5760,300,34,240,6,'fence',5); breakable(5820,300,34,240,6,'fence',5);

    // Stage gates are drawn and collided dynamically; put visual gateposts here.
    for(let i=0;i<STAGES.length-1;i++){
      const g=STAGES[i].gate;prop('gatePost',g.x-10,g.y-15,0,i);prop('gatePost',g.x-10,g.y+g.h+15,0,i);
    }

    // Collision footprints are generated from the same authored props that are drawn.
    // They are intentionally smaller than the artwork so the player never catches on empty air.
    const footprints={
      bench:{w:82,h:24},pot:{w:22,h:22},busSign:{w:14,h:14},lamp:{w:18,h:18},porchLight:{w:16,h:16},porchlight:{w:16,h:16},bollard:{w:10,h:10},gatePost:{w:14,h:14},
      table:{w:82,h:58},sofa:{w:112,h:50},tree:{w:24,h:24},dumpster:{w:116,h:56},mural:{w:164,h:18},antenna:{w:16,h:16},hydrant:{w:18,h:18},mailbox:{w:20,h:20},barrel:{w:30,h:30},
      windowsill:{w:104,h:22},waterTower:{w:136,h:116},vent:{w:96,h:70}
    };
    for(const p of props){
      const f=footprints[p.type];if(!f)continue;
      // Large props that already have authored structural walls do not need a duplicate footprint.
      if(p.type==='waterTower'||p.type==='vent')continue;
      colliders.push({x:p.x-f.w*.5,y:p.y-f.h*.5,w:f.w,h:f.h,z:p.z||0,stage:p.stage,kind:'propCollider',source:p.type});
    }

    return {surfaces,walkables,ramps,walls,props,lights,destructibles,colliders};
  }

  function groundZ(world,x,y){
    for(const r of world.ramps){
      if(C.pointInRect(x,y,r)){
        const t=C.clamp((x-r.x)/r.w,0,1);return C.lerp(r.from,r.to,t);
      }
    }
    let best=0;
    for(const s of world.surfaces){if(C.pointInRect(x,y,s)&&s.z>best)best=s.z;}
    return best;
  }

  function isWalkable(world,x,y){
    for(const r of world.walkables)if(C.pointInRect(x,y,r))return true;
    return false;
  }

  function stageAt(x,y){
    for(let i=STAGES.length-1;i>=0;i--)if(C.pointInRect(x,y,STAGES[i].bounds))return i;
    return 0;
  }

  global.PotContent={VERSION:'2.2.0',ENEMIES,STAGES,VERBS,RANKS,TUTORIALS,buildWorld,groundZ,isWalkable,stageAt};
})(window);
