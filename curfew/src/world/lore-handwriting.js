// A place's old record and the later, unsigned kindness share a hand.
export const SITE_HANDS = Object.freeze({
 'filling-station':'dot', 'blackthorn-manor':'lucian', 'avery-house':'avery',
 'weeping-mine':'abel', holdfast:'vera', 'the-toll':'brandt', relay:'dell',
 cathedral:'brand', chapel:'cass', gallowsfen:'sexton', 'drowned-light':'ingrid',
 'hollow-mill':'fisk', 'garden-of-rest':'ostrander', 'bell-tower':'t', jackfield:'jackfield',
 'standing-stones':'county', 'great-tree':'marnie', 'black-rib':'stone',
 'mourning-glasshouse':'dunmore', 'choir-vault':'delia', 'red-quarry':'crane', morning:'emmett',
});
export function handwritingStyle(siteId){
 const hand=SITE_HANDS[siteId]||siteId;let seed=0;for(const c of hand)seed=(seed*31+c.charCodeAt(0))>>>0;
 return {id:hand,seed,font:seed%3===0?'"Segoe Print", cursive':seed%3===1?'"Comic Sans MS", cursive':'Georgia, serif',slant:((seed%7)-3)*.009,spacing:1+(seed%4)*.28};
}
export function paintHandwriting(ctx,text,x,y,width,size,siteId){
 const s=handwritingStyle(siteId);ctx.save();ctx.translate(x,y);ctx.rotate(s.slant);
 ctx.font=`${s.seed%2?'italic ':''}${size}px ${s.font}`;ctx.textAlign='left';ctx.textBaseline='alphabetic';
 const measured=ctx.measureText(text).width+text.length*s.spacing,scale=Math.min(1,width/Math.max(1,measured));ctx.scale(scale,1);
 let advances=GLYPHS.get(ctx.font);if(!advances){advances=new Map();GLYPHS.set(ctx.font,advances);}
 let at=0;for(let i=0;i<text.length;i++){const ch=text[i];let advance=advances.get(ch);if(advance===undefined){advance=ctx.measureText(ch).width;advances.set(ch,advance);}ctx.fillText(ch,at,Math.sin((i+s.seed)*1.71)*size*.025);at+=advance+s.spacing;}
 ctx.restore();
}
const GLYPHS=new Map();
