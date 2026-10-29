// Source warp objects join the previously independent first-star stages.
// Geometry and collision for Bowser's pipes are already static_prop objects.
export function exitAtPlayer(course,player){
  if(player.dead||player.disabled)return null;
  const targets={bitdw:'bowser_1',bitfs:'bowser_2',bits:'bowser_3',hmc:'cotmc'},target=targets[course.id];if(!target)return null;
  const object=(course.objects||[]).find(o=>course.id==='hmc'?o.kind==='bhvWarp'&&/WARP_NODE_0B/.test(o.params||''):o.kind==='bhvWarpPipe'||o.kind==='bhvWarp'&&(o.behaviorParam2===11||/WARP_NODE_0B/.test(o.params||'')));
  if(!object)return null;
  const [x,y,z]=object.position,p=player.position,radius=course.id==='hmc'?5.2:object.kind==='bhvWarpPipe'?.80:2;
  const top=object.kind==='bhvWarpPipe'?1.7:1.6;
  if(Math.hypot(p.x-x,p.z-z)>=radius||p.y>y+top||p.y<y-5)return null;
  if(object.kind==='bhvWarpPipe'&&player.velocity.y>.05)return null;
  return{course:target};
}
export async function attachWorldConnections({course,world,navigate}){
  let entered=false;
  return{reset(){entered=false;},update(dt,player){if(entered)return;const target=exitAtPlayer(course,player);if(target){entered=true;navigate(target);}}};
}
