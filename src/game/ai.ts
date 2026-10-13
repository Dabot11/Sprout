import { SPECIES } from './config';
import type { Creature } from './creatures';
import type { Food } from './scene';
export function think(c:Creature,neighbors:Creature[],foods:Food[],player:Creature,dt:number,time:number):{x:number;y:number;boost:boolean} {
  const spec=SPECIES[c.species!];c.rest=Math.max(0,c.rest-dt);c.wander-=dt;
  const threats=neighbors.filter(n=>n.id!==c.id&&n.radius>c.radius*.85&&n.parts.some(p=>p==='jaw'||p==='spike'));
  if(player.radius>c.radius*.8&&player.parts.some(p=>p==='jaw'||p==='spike')) threats.push(player);
  const threat=threats.sort((a,b)=>Math.hypot(a.x-c.x,a.y-c.y)-Math.hypot(b.x-c.x,b.y-c.y))[0];
  if(spec.behavior!=='hunt' && threat && Math.hypot(threat.x-c.x,threat.y-c.y)<c.radius*9+110) {
    c.intent=Math.atan2(c.y-threat.y,c.x-threat.x);return {x:Math.cos(c.intent),y:Math.sin(c.intent),boost:spec.behavior==='flee'};
  }
  if(spec.behavior==='hunt' && c.rest===0){
    const targets=[player,...neighbors].filter(n=>n.id!==c.id&&n.health>0&&n.radius<c.radius*1.45&&Math.hypot(n.x-c.x,n.y-c.y)<c.radius*12+180);
    const target=targets.sort((a,b)=>Math.hypot(a.x-c.x,a.y-c.y)-Math.hypot(b.x-c.x,b.y-c.y))[0];
    if(target){
      c.chase+=dt;c.intent=Math.atan2(target.y-c.y,target.x-c.x);
      if(c.chase>5){c.rest=4;c.chase=0;c.charge=0;}
      else {
        if(Math.hypot(target.x-c.x,target.y-c.y)<c.radius*5 && c.charge===0) c.charge=.001;
        if(c.charge>0){c.charge+=dt;if(c.charge>1){c.charge=0;c.rest=2;}}
        const signal=c.charge>0&&c.charge<.65;
        return {x:Math.cos(c.intent)*(signal?.22:1),y:Math.sin(c.intent)*(signal?.22:1),boost:c.charge>=.65};
      }
    }else {c.chase=Math.max(0,c.chase-dt);c.charge=0;}
  }
  const suitable=foods.filter(f=>f.active&&f.kind===(spec.behavior==='filter'?'particle':spec.behavior==='hunt'?'remains':'algae'));
  const food=suitable.sort((a,b)=>Math.hypot(a.x-c.x,a.y-c.y)-Math.hypot(b.x-c.x,b.y-c.y))[0];
  if(food) c.intent=Math.atan2(food.y-c.y,food.x-c.x);
  else if(c.wander<=0){c.intent=c.angle+(Math.sin(time*.7+c.id*13))*1.7;c.wander=1.5+Math.random()*2;}
  return {x:Math.cos(c.intent),y:Math.sin(c.intent),boost:false};
}
