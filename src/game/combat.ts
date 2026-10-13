import { BALANCE, type Parts, type PartKind } from './config';
import { bodyRadius, type BodyProfile } from './anatomy';
import { partPosition } from './model';
export interface ContactActor{id:number;x:number;y:number;angle:number;radius:number;parts:Parts;angles?:number[];shape:number;profile:BodyProfile;health:number}
export interface Cloud{owner:number;x:number;y:number;radius:number;created:number;expires:number}
export type ToolEvent={kind:'poison';cloud:Cloud}|{kind:'electric';damage:number;stun:number;target:number;x:number;y:number};
export class ContactTools{
  clouds:Cloud[]=[];private timers=new Map<string,number>();
  reset(){this.clouds=[];this.timers.clear();}
  contact(attacker:ContactActor,target:ContactActor,time:number):ToolEvent[]{
    if(attacker.id===target.id||attacker.health<=0||target.health<=0)return [];
    const events:ToolEvent[]=[],bearing=Math.atan2(attacker.y-target.y,attacker.x-target.x),targetRadius=target.radius*bodyRadius(bearing-target.angle,target.shape,target.profile);
    for(const part of ['poison','electric'] as PartKind[]){const key=`${attacker.id}:${part}`,cooldown=part==='poison'?BALANCE.poisonCooldown:BALANCE.electricCooldown;if((this.timers.get(key)??-100)+cooldown>time)continue;
      const slot=attacker.parts.findIndex((p,i)=>{if(p!==part)return false;const pos=partPosition(attacker.x,attacker.y,attacker.angle,attacker.radius,i,attacker.angles,attacker.shape,attacker.profile);return Math.hypot(pos.x-target.x,pos.y-target.y)<targetRadius+attacker.radius*.5;});if(slot<0)continue;
      if(part==='poison'&&this.clouds.length>=BALANCE.maxClouds)continue;
      this.timers.set(key,time);const pos=partPosition(attacker.x,attacker.y,attacker.angle,attacker.radius,slot,attacker.angles,attacker.shape,attacker.profile);
      if(part==='poison'){const cloud={owner:attacker.id,x:pos.x,y:pos.y,radius:attacker.radius*1.5,created:time,expires:time+BALANCE.poisonDuration};this.clouds.push(cloud);events.push({kind:'poison',cloud});}
      else events.push({kind:'electric',damage:BALANCE.electricDamage,stun:BALANCE.electricStun,target:target.id,x:target.x,y:target.y});
    }return events;
  }
  tick(actors:ContactActor[],time:number,dt:number){
    const damage=new Map<number,number>();
    for(const actor of actors){if(actor.health<=0)continue;
      const intervals=this.clouds.filter(c=>c.owner!==actor.id&&Math.hypot(c.x-actor.x,c.y-actor.y)<c.radius+actor.radius*bodyRadius(Math.atan2(c.y-actor.y,c.x-actor.x)-actor.angle,actor.shape,actor.profile)).map(c=>[Math.max(time-dt,c.created),Math.min(time,c.expires)]).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);
      let duration=0,end=-Infinity;for(const [a,b]of intervals){duration+=Math.max(0,b-Math.max(a,end));end=Math.max(end,b);}if(duration>0)damage.set(actor.id,BALANCE.poisonDamagePerSecond*duration);
    }
    this.clouds=this.clouds.filter(c=>c.expires>time);return damage;
  }
}
