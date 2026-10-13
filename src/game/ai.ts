import { SPECIES } from './config';
import type { Creature } from './creatures';
import type { Food } from './scene';
const armed=(c:Creature)=>c.parts.some(p=>p==='jaw'||p==='spike'||p==='poison'||p==='electric');
export function think(c:Creature,neighbors:Creature[],foods:Food[],player:Creature,dt:number,time:number):{x:number;y:number;boost:boolean}{
  const spec=SPECIES[c.species!];c.rest=Math.max(0,c.rest-dt);c.wander-=dt;
  const unique=[...new Map([player,...neighbors].filter(n=>n.id!==c.id&&n.health>0).map(n=>[n.id,n])).values()];
  const threat=unique.filter(n=>armed(n)&&n.radius>c.radius*.65).sort((a,b)=>Math.hypot(a.x-c.x,a.y-c.y)-Math.hypot(b.x-c.x,b.y-c.y))[0];
  if(!['hunt','guard'].includes(spec.behavior)&&threat&&Math.hypot(threat.x-c.x,threat.y-c.y)<c.radius*9+110){
    c.intent=Math.atan2(c.y-threat.y,c.x-threat.x);if(spec.behavior==='flee'&&time>=(c.nextEscape??0)){c.escapeUntil=time+.28;c.nextEscape=time+3;}
    return {x:Math.cos(c.intent),y:Math.sin(c.intent),boost:(c.escapeUntil??0)>time};
  }
  if(spec.behavior==='guard'){
    const homeX=c.homeX??c.x,homeY=c.homeY??c.y,range=c.radius*8;
    if(Math.hypot(c.x-homeX,c.y-homeY)>range){c.intent=Math.atan2(homeY-c.y,homeX-c.x);c.chase=0;c.charge=0;return {x:Math.cos(c.intent),y:Math.sin(c.intent),boost:false};}
    const intruder=unique.find(n=>n.radius<c.radius*1.7&&Math.hypot(n.x-homeX,n.y-homeY)<range*.65);
    if(intruder&&c.rest===0){c.intent=Math.atan2(intruder.y-c.y,intruder.x-c.x);return {x:Math.cos(c.intent),y:Math.sin(c.intent),boost:false};}
  }
  if(spec.behavior==='hunt'&&c.rest===0){
    const target=unique.filter(n=>n.radius<c.radius*1.55&&n.radius>c.radius*.26&&Math.hypot(n.x-c.x,n.y-c.y)<c.radius*12+180).sort((a,b)=>Math.hypot(a.x-c.x,a.y-c.y)-Math.hypot(b.x-c.x,b.y-c.y))[0];
    if(target){c.chase+=dt;c.intent=Math.atan2(target.y-c.y,target.x-c.x);if(c.chase>5){c.rest=4;c.chase=0;c.charge=0;}else{
      if(Math.hypot(target.x-c.x,target.y-c.y)<c.radius*5&&c.charge===0)c.charge=.001;
      if(c.charge>0){c.charge+=dt;if(c.charge>1){c.charge=0;c.rest=2;}}
      const signal=c.charge>0&&c.charge<.65;return {x:Math.cos(c.intent)*(signal?.22:1),y:Math.sin(c.intent)*(signal?.22:1),boost:c.charge>=.65};
    }}else {c.chase=Math.max(0,c.chase-dt);c.charge=0;}
  }
  const edible=c.parts.includes('gather')?'algae':c.parts.includes('filter')?'particle':'remains';
  const food=foods.filter(f=>f.active&&f.kind===edible).sort((a,b)=>Math.hypot(a.x-c.x,a.y-c.y)-Math.hypot(b.x-c.x,b.y-c.y))[0];
  if(food)c.intent=Math.atan2(food.y-c.y,food.x-c.x);else if(c.wander<=0){c.intent=c.angle+Math.sin(time*.7+c.id*13)*1.7;c.wander=1.5+Math.random()*2;}
  return {x:Math.cos(c.intent),y:Math.sin(c.intent),boost:false};
}
