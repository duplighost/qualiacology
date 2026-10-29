// The journal reads the same bounds and collision surfaces as the level.
// It never substitutes a hand-drawn route for the world that is being played.
export function paintPlazaMap(canvas,world,player,state={}){
  const ctx=canvas.getContext('2d');if(!ctx||!world||!player)return;
  const w=canvas.width,h=canvas.height,b=world.bounds,margin=28;
  const scale=Math.min((w-margin*2)/(b.x1-b.x0),(h-margin*2)/(b.z1-b.z0));
  const ox=(w-(b.x1-b.x0)*scale)/2,oz=(h-(b.z1-b.z0)*scale)/2;
  const mx=x=>ox+(x-b.x0)*scale,mz=z=>oz+(z-b.z0)*scale;
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#203c3c';ctx.fillRect(0,0,w,h);
  // Dense short ribbons keep the sea legible as strands rather than a flat fill.
  ctx.lineWidth=1;ctx.strokeStyle='#698b80';ctx.globalAlpha=.18;
  for(let y=4;y<h;y+=8){ctx.beginPath();for(let x=0;x<=w;x+=8){const yy=y+Math.sin(x*.04+y)*1.5;x?ctx.lineTo(x,yy):ctx.moveTo(x,yy);}ctx.stroke();}ctx.globalAlpha=1;
  const cells=94,dx=(b.x1-b.x0)/cells,dz=(b.z1-b.z0)/cells;
  for(let z=0;z<cells;z++)for(let x=0;x<cells;x++){
    const xx=b.x0+(x+.5)*dx,zz=b.z0+(z+.5)*dz,surface=world.surfaceAt(xx,zz);
    if(!['water','void','lava','poison'].includes(surface)){ctx.fillStyle=world.inSewer?'#ad8450':'#d9bb7b';ctx.fillRect(mx(xx-dx/2),mz(zz-dz/2),dx*scale+.5,dz*scale+.5);}
  }
  if(!world.inSewer)for(const c of world.colliders||[]){
    if(c.top<5||c.bottom>player.position.y+45||/boat|crate|door|slab/.test(c.kind||''))continue;
    ctx.fillStyle=c.top>18?'#a56b3f':'#b98c55';ctx.fillRect(mx(c.minX),mz(c.minZ),(c.maxX-c.minX)*scale,(c.maxZ-c.minZ)*scale);
    ctx.strokeStyle='#ead6a3';ctx.lineWidth=.7;ctx.strokeRect(mx(c.minX),mz(c.minZ),(c.maxX-c.minX)*scale,(c.maxZ-c.minZ)*scale);
  }
  const route=state.navigationRoute||[];
  if(route.length>1){ctx.strokeStyle='#fff0bd';ctx.lineWidth=2;ctx.setLineDash([4,5]);ctx.beginPath();route.forEach((p,i)=>{const x=Array.isArray(p)?p[0]:p.x,z=Array.isArray(p)?p[1]:p.z;i?ctx.lineTo(mx(x),mz(z)):ctx.moveTo(mx(x),mz(z));});ctx.stroke();ctx.setLineDash([]);}
  // Entrance numbers correspond to the fifteen destinations in the selector.
  const numbers={bianco:1,ricco:2,gelato:3,pinna:4,sirena:5,noki:6,pianta:7,airstrip:8,corona:9,pachinko:11,lily:12,slide:13,turbo:14,field:15};
  if(!world.inSewer)for(const portal of world.portals||[]){const p=portal.position;if(!p||!numbers[portal.id])continue;ctx.fillStyle='#294139';ctx.beginPath();ctx.arc(mx(p.x),mz(p.z),8,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#f6e0a7';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#fff3cf';ctx.font='bold 9px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(numbers[portal.id]),mx(p.x),mz(p.z)+.4);}
  const goal=state.navigationTarget||state.goalPosition;
  if(goal){ctx.strokeStyle='#fff4cc';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(mx(goal.x),mz(goal.z),12,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(mx(goal.x)-17,mz(goal.z));ctx.lineTo(mx(goal.x)+17,mz(goal.z));ctx.moveTo(mx(goal.x),mz(goal.z)-17);ctx.lineTo(mx(goal.x),mz(goal.z)+17);ctx.stroke();}
  ctx.save();ctx.translate(mx(player.position.x),mz(player.position.z));ctx.rotate(-player.heading);ctx.fillStyle='#fff9e8';ctx.strokeStyle='#45331e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,10);ctx.lineTo(-6,-6);ctx.lineTo(0,-3);ctx.lineTo(6,-6);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  ctx.fillStyle='#e8ddb5';ctx.font='10px system-ui';ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillText('N ↑',16,22);ctx.fillText('△ YOU     ⊕ TRACKED OBJECTIVE     ① DESTINATION',16,h-16);
}
