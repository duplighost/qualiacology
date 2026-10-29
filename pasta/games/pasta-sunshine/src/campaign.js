export const COURSE_IDS=['bianco','ricco','gelato','pinna','sirena','noki','pianta','airstrip','corona','plaza','pachinko','lily','slide','turbo','field'];
export const EPISODE_COUNTS={bianco:1,ricco:1,gelato:1,pinna:2,sirena:2,noki:2,pianta:2,airstrip:2,corona:1,plaza:11,pachinko:1,lily:1,slide:1,turbo:1,field:1};
export const BLUE_COIN_IDS=Object.freeze(Array.from({length:19},(_,i)=>'plaza-'+String(i+1).padStart(2,'0')));
export const TOTAL_MISSION_SHINES=Object.values(EPISODE_COUNTS).reduce((a,b)=>a+b,0);
export const TOTAL_EXCHANGE_SHINES=Math.floor(BLUE_COIN_IDS.length/10);
export const TOTAL_SHINES=TOTAL_MISSION_SHINES+TOTAL_EXCHANGE_SHINES;
const KEY='pasta-sunshine-campaign-v2';
const isRecord=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const boundedCount=(value,max)=>Number.isFinite(Number(value))?Math.max(0,Math.min(max,Math.floor(Number(value)))):0;
const record=value=>({shine:value?.shine===true,bestTime:Number.isFinite(value?.bestTime)&&value.bestTime>0?value.bestTime:null,bestCoins:boundedCount(value?.bestCoins,999),clears:boundedCount(value?.clears,9999)});
export const validEpisode=(id,episode)=>COURSE_IDS.includes(id)&&Number.isInteger(episode)&&episode>=1&&episode<=EPISODE_COUNTS[id];
export function episodeRecord(state,id,episode=1){const course=state?.courses?.[id];return EPISODE_COUNTS[id]>1?course?.episodes?.[episode]:episode===1?course:undefined;}
export function normalizeCampaign(data={}) {
  if(!isRecord(data))data={};
  const blueCoins=Array.isArray(data.plaza?.blueCoins)?[...new Set(data.plaza.blueCoins.filter(id=>BLUE_COIN_IDS.includes(id)))]:[];
  const value={version:2,selected:COURSE_IDS.includes(data.selected)?data.selected:'plaza',selectedEpisodes:{},courses:{},plaza:{blueCoins,trades:boundedCount(data.plaza?.trades,Math.min(TOTAL_EXCHANGE_SHINES,Math.floor(blueCoins.length/10)))}};
  for(const id of COURSE_IDS){
    const entry=isRecord(data.courses?.[id])?data.courses[id]:{};
    value.selectedEpisodes[id]=validEpisode(id,data.selectedEpisodes?.[id])?data.selectedEpisodes[id]:1;
    if(EPISODE_COUNTS[id]===1)value.courses[id]=record(entry);
    else{
      const episodes={};
      for(let ep=1;ep<=EPISODE_COUNTS[id];ep++)episodes[ep]=record(entry.episodes?.[ep]||(ep===1?entry:{}));
      // Preserve the first-Shine fields used by earlier versions and the hub.
      value.courses[id]={...episodes[1],episodes};
    }
  }
  return value;
}
export function createCampaign(storage) {
  let raw;try{raw=JSON.parse(storage?.getItem(KEY)||'null');}catch{}
  const validSave=isRecord(raw)&&raw.version===2&&isRecord(raw.courses);
  const state=normalizeCampaign(validSave?raw:{});
  // Highlight this expansion once without replacing any earlier records.
  if(validSave&&!raw.courses.plaza?.episodes?.[11]){state.selected='plaza';if(raw.courses.plaza?.episodes?.[2]?.shine)state.selectedEpisodes.plaza=3;}
  if(!validSave){try{const old=Number(storage?.getItem('pasta-sunshine-best'));if(Number.isFinite(old)&&old>0)state.courses.bianco={shine:true,bestTime:old,bestCoins:0,clears:1};}catch{}}
  const persist=()=>{try{storage?.setItem(KEY,JSON.stringify(state));}catch{}};
  return {
    get state(){return state;},
    get selectedEpisode(){return state.selectedEpisodes[state.selected];},
    select(id,episode=state.selectedEpisodes[id]||1){if(!validEpisode(id,episode))return false;state.selected=id;state.selectedEpisodes[id]=episode;persist();return true;},
    complete(id,{time,coins=0,episode=1}={}){
      if(!validEpisode(id,episode)||!Number.isFinite(time)||time<=0)return false;
      const old=episodeRecord(state,id,episode);old.shine=true;old.bestTime=old.bestTime===null?time:Math.min(old.bestTime,time);old.bestCoins=Math.max(old.bestCoins,boundedCount(coins,999));old.clears=Math.min(9999,old.clears+1);
      if(EPISODE_COUNTS[id]>1&&episode===1)Object.assign(state.courses[id],old);
      persist();return true;
    },
    collectBlueCoin(id){if(!BLUE_COIN_IDS.includes(id)||state.plaza.blueCoins.includes(id))return false;state.plaza.blueCoins.push(id);persist();return true;},
    tradeBlueCoins(){const balance=state.plaza.blueCoins.length-state.plaza.trades*10;if(balance<10||state.plaza.trades>=TOTAL_EXCHANGE_SHINES)return{ok:false,trades:state.plaza.trades,balance};state.plaza.trades++;persist();return{ok:true,trades:state.plaza.trades,balance:balance-10};},
    plazaProgress(){return{collectedEpisodes:Array.from({length:11},(_,i)=>i+1).filter(ep=>episodeRecord(state,'plaza',ep)?.shine),blueCoins:[...state.plaza.blueCoins],trades:state.plaza.trades,balance:state.plaza.blueCoins.length-state.plaza.trades*10};},
    get missionShineCount(){return COURSE_IDS.reduce((sum,id)=>sum+Array.from({length:EPISODE_COUNTS[id]},(_,i)=>episodeRecord(state,id,i+1).shine?1:0).reduce((a,b)=>a+b,0),0);},
    get shineCount(){return this.missionShineCount+state.plaza.trades;}
  };
}
export const COURSE_INFO={
  bianco:{id:'bianco',number:'01',name:'Bianco Hills',episode:'Road to the Big Windmill',boss:'PROTO PIRANHA',bossHP:3,short:'Windmills, hills & a very tangled welcome.',intro:'Follow the rigatoni through the village. Find the waterwheel passage.',win:'The road is clear. The windmill is all yours.',spawnYaw:Math.PI,completionLabel:'TANGLES CLEARED'},
  ricco:{id:'ricco',number:'02',name:'Ricco Harbor',episode:'Gooper Blooper Breaks Out',boss:'GOOPER BLOOPER',bossHP:2,short:'Cranes, cargo & one extremely long lunch.',intro:'Board the freighter. Ride the pasta cranes toward the upper harbor.',win:'Two pulls. One giant squid. A very well-earned Shine.',spawnYaw:Math.PI,completionLabel:'TANGLES CLEARED'},
  gelato:{id:'gelato',number:'03',name:'Gelato Beach',episode:'Dune Bud Sand Castle Secret',boss:'',bossHP:0,short:'A sunlit shore. A castle coming apart at the seams.',intro:'Cross to the beach. Spray the Dune Bud beside the peninsula to raise the sand portal.',win:'Across the crumbling strands, all the way to the top.',spawnYaw:Math.PI,completionLabel:'BLOCKS CROSSED'},
  pinna:{id:'pinna',number:'04',name:'Pinna Park',episode:'Mecha-Bowser Appears!',boss:'MECHA-BOWSER',bossHP:4,short:'A roller coaster of spaghetti. An enormous appetite for rockets.',intro:'Follow Shadow Mario through the park to the pool. Board the coaster to face Mecha-Bowser.',win:'Four rockets. One very uncoiled mechanical monster.',spawnYaw:Math.PI,completionLabel:'ROCKET HITS'},
  sirena:{id:'sirena',number:'05',name:'Sirena Beach',episode:'The Manta Storm',boss:'PHANTAMANTA',bossHP:0,short:'Sunset, a vanished hotel, and a storm of multiplying pasta.',intro:'Find the hotel manager. Clear the electric pasta and split the manta swarm with your jet.',win:'Every last manta is gone. Hotel Delfino rises from the strands.',spawnYaw:Math.PI,completionLabel:'MANTAS CLEARED'},
  noki:{id:'noki',number:'06',name:'Noki Bay',episode:'Uncork the Waterfall',boss:'MONTY MOLE',bossHP:3,short:'Cliffs of folded pasta. A waterfall waiting to unravel.',intro:'Climb above the polluted bay. Spray the lift mechanisms and clean the blocked ledges to reach the cork.',win:'The cork is out. A whole waterfall of spaghetti can breathe again.',spawnYaw:Math.PI,completionLabel:'BOMBS RETURNED'},
  pianta:{id:'pianta',number:'07',name:'Pianta Village',episode:'Chain Chomplets Unchained',boss:'',bossHP:0,short:'A village in the trees. Three very overheated noodles.',intro:'Cross the suspension bridge. Cool the Chain Chomplets, pull their tails, and launch all three into the pool.',win:'Three cool Chomplets. A village that can finally sleep.',spawnYaw:Math.PI,completionLabel:'CHOMPLETS COOLED'},
  airstrip:{id:'airstrip',number:'08',name:'Delfino Airstrip',episode:'Delfino Airstrip Dilemma',boss:'PROTO PIRANHA',bossHP:3,short:'Touch down on pasta. Your holiday starts with a very messy runway.',intro:'Find the pasta sprayer, wash the runway, and spray Proto Piranha when its mouth opens.',win:'The runway is clear. Even the emergency landing was pasta.',spawnYaw:Math.PI,completionLabel:'MOUTH HITS'},
  corona:{id:'corona',number:'09',name:'Corona Mountain',episode:'Father and Son Shine!',boss:'BOWSER & BOWSER JR.',bossHP:5,short:'A volcano full of spaghetti. The family bath has gone too far.',intro:'Cross the lava platforms. Use spray recoil to steer the boat, then rocket up into the clouds.',win:'Five supports down. The world’s most unreasonable pasta bath is over.',spawnYaw:Math.PI,completionLabel:'SUPPORTS BROKEN'},
  plaza:{id:'plaza',number:'10',name:'Delfino Plaza',episode:'Shine Sprite in the Sand',boss:'',bossHP:0,short:'Eleven town Shines, hidden coins, and a whole island to explore.',intro:'All eleven Plaza objectives share this town. Open the Plaza journal with Tab to choose a lead, or explore freely.',win:'The beach has given up its secret. The plaza is yours to explore.',spawnYaw:Math.PI,completionLabel:'EMBLEM CLEANED'},
  pachinko:{id:'pachinko',number:'11',name:'Pachinko Game',episode:'Pachinko Game',boss:'',bossHP:0,short:'A spring, five pockets, and a very bouncy noodle.',intro:'Ride the boat beneath the bridge and enter the hidden course. Collect three launch-lane coins and five pocket coins.',win:'Eight red coins. One last launch. An improbable pasta victory.',spawnYaw:Math.PI,completionLabel:'RED COINS'},
  lily:{id:'lily',number:'12',name:'Lily Pad Ride',episode:'Lily Pad Ride',boss:'',bossHP:0,short:'One wilting pasta raft. Eight reasons to keep steering.',intro:'Feed Yoshi and cross the boats to the island pipe. Then steer the decaying pasta raft through all eight red coins.',win:'Every red coin rescued from the most hostile bowl of pasta on the island.',spawnYaw:Math.PI,completionLabel:'RED COINS'},
  slide:{id:'slide',number:'13',name:'Super Slide',episode:'Super Slide',boss:'',bossHP:0,short:'A ribbon of slippery pasta. Keep your momentum and watch the gaps.',intro:'Slide down the folded pasta slope. Steer around the holes, carry speed over the ramps, and land on the narrow finish.',win:'From the broad slope to the very last strand.',spawnYaw:Math.PI,completionLabel:'COURSE PROGRESS'},
  turbo:{id:'turbo',number:'14',name:'Turbo Track',episode:'Turbo Track',boss:'',bossHP:0,short:'Charge the nozzle. Commit to the jump. Keep the pasta beneath you.',intro:'Refill at the start, select Turbo, and hold BOOST. Jump between the floating pasta platforms all the way to the final Shine.',win:'Every gap cleared. The fastest course in the kitchen.',spawnYaw:Math.PI,completionLabel:'PLATFORMS REACHED'},
  field:{id:'field',number:'15',name:'Red Coin Field',episode:'Red Coin Field',boss:'',bossHP:0,short:'Eight hidden red coins in one small, lively pasta field.',intro:'Explore the field, defeat the pods, help the burning Pianta, spray the bird, and uncover the hidden alcove. Save your tank: there is no refill.',win:'Eight little mysteries, one shining reward.',spawnYaw:Math.PI,completionLabel:'RED COINS'}
};
const SECOND_EPISODES={
  pinna:{episode:"The Beach Cannon's Secret",boss:'MONTY MOLE',bossHP:3,short:'Return the bombs. Take the cannon. Keep the pasta under your feet.',intro:'Approach the beach cannon. Spray a bomb, hold G / GRAB to pick it up, then release to throw.',win:'Through the cannon and across the disappearing spaghetti.',completionLabel:'BLOCKS CROSSED'},
  sirena:{episode:"The Hotel Lobby's Secret",boss:'',bossHP:0,short:'Boo steps, a golden mouth, and a secret that keeps on turning.',intro:'Speak to the hotel manager with G / TALK. Spray the Block Boos and climb the central pillar.',win:'From the haunted lobby to the far end of the turning pasta.',completionLabel:'BLOCKS CROSSED'},
  noki:{episode:'The Boss of Tricky Ruins',boss:'GOOPER BLOOPER',bossHP:2,short:'Spray the ancient walls. Find the monster above the maze.',intro:'Meet the elder across the bay. Spray the marked wall panels and climb the temporary passages.',win:'The ruins open. The pasta treasure is yours.',completionLabel:'FACE PULLS'},
  pianta:{episode:"Il Piantissimo's Crazy Climb",boss:'',bossHP:0,short:'Thirty seconds. One towering tree. A very determined rival.',intro:'Meet Il Piantissimo beyond the bridge. Race through the village to the flag above the spa.',win:'First to the flag. Fastest noodle in the canopy.',completionLabel:'RACE TIME'},
  airstrip:{episode:'Red Coin Waterworks',boss:'',bossHP:0,short:'Eight red coins. Two minutes. A turbocharged plate of spaghetti.',intro:'Collect the Turbo Nozzle. Jump and press F / DOWN onto the red switch, then race through all eight coins.',win:'Every red coin collected. Your noodles have cleared for takeoff.',completionLabel:'RED COINS'},
  plaza:{episode:'Boxing Clever 1',boss:'',bossHP:0,short:'Ten pasta crates. Thirty seconds. Make a mess.',intro:'Enter the crate shop beside the Shine Gate and talk to the Pianta. Jump and press F / DOWN to break ten crates in thirty seconds.',win:'Ten crates reduced to dinner. The shopkeeper owes you a Shine.',completionLabel:'CRATES BROKEN'}
};
const PLAZA_EPISODES={
  3:{episode:'Boxing Clever 2',short:'Ten stacked pasta crates. One precise ground pound at a time.',intro:'Return to the crate guy for the stacked-crate challenge. Clear every crate in thirty seconds.',win:'Every stack dismantled before the clock ran out.',completionLabel:'CRATES BROKEN'},
  4:{episode:'Clean the West Bell',short:'A dirty bell, a hidden chamber, and a route beneath the town.',intro:'Clean the west bell with sustained spray. Use the sewer route to reach the Shine inside its tower.',win:'The west bell is clean, and its hidden chamber has paid off.',completionLabel:'BELL CLEANED'},
  5:{episode:'Mario Toss',short:'One coin buys a flight across the rooftops.',intro:'Find the Chuckster above the crate shop. Stand on the correct side, pay one coin, and land in the tower window.',win:'A paid flight with a very satisfying landing.',completionLabel:'TOSS COMPLETE'},
  6:{episode:'The Gold Bird',short:'A golden pasta bird circles the offshore island.',intro:'Cross to the island and follow the golden bird. Keep your spray on it until it releases a Shine.',win:'The golden bird has shared its secret.',completionLabel:'BIRD SPRAYED'},
  7:{episode:'Turbo Dash!',short:'Dry pasta doors meet a fully charged Turbo Nozzle.',intro:'Collect Turbo at the nozzle boxes. Build speed and break the doors below the west bell tower.',win:'Through the doors and straight into the Shine.',completionLabel:'DOORS BROKEN'},
  8:{episode:'Lighthouse Roof',short:'Rocket to the lighthouse. Hit the marked roof from high above.',intro:'Collect Rocket, reach the lighthouse roof, then launch high and ground pound its marked slab.',win:'The lighthouse roof has cracked open its secret.',completionLabel:'ROOF BROKEN'},
  9:{episode:'Clean the East Bell',short:'Wash the bell, then reach the Shine high above it.',intro:'Rocket up to the east bell, clean it, and climb higher to collect the reward.',win:'A clean bell and a Shine above the rooftops.',completionLabel:'BELL CLEANED'},
  10:{episode:'The Shine Gate Sparkle',short:'The town’s greatest landmark deserves a proper wash.',intro:'Climb the Shine Gate and wash the giant pasta emblem. Rocket above the gate to collect the Shine.',win:'The Shine Gate shines again.',completionLabel:'GATE CLEANED'},
  11:{episode:'100 Coins',short:'A town-wide hunt through streets, rooftops, and sewers.',intro:'Collect one hundred yellow coins during this visit, then retrieve the Shine. Search the streets, rooftops and sewers; there are spare coins beyond the hundred you need.',win:'A hundred coins, collected across the whole town.',completionLabel:'COINS COLLECTED'}
};
export function getCourseInfo(id,episode=1){if(!validEpisode(id,episode))return null;return {...COURSE_INFO[id],...(episode===2?SECOND_EPISODES[id]:{}),...(id==='plaza'?PLAZA_EPISODES[episode]:{}),episodeNumber:episode};}
export function nextMission(state,id,episode=1){
  const missions=COURSE_IDS.flatMap(course=>Array.from({length:EPISODE_COUNTS[course]},(_,i)=>({id:course,episode:i+1})));
  const index=missions.findIndex(m=>m.id===id&&m.episode===episode),ordered=missions.map((_,i)=>missions[(index+i+1)%missions.length]);
  return ordered.find(m=>!episodeRecord(state,m.id,m.episode)?.shine)||ordered[0];
}
