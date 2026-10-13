import { anchor, DEFAULT_ANGLES, DEFAULT_EYES, ORGAN_SLOTS, profileFor, profileMass, localAngle, propulsion, turningPropulsion, type BodyProfile, type Eyes, type SkinPattern } from './anatomy';
import { BALANCE, PARTS, type Parts, type PartKind, type FoodKind } from './config';
export interface Run {scale:number;parts:Parts;angles:number[];shape:number;color:number;profile:BodyProfile;eyes:Eyes;pattern:SkinPattern;inventory:Record<PartKind,number>;points:number;health:number;food:number;finalFood:number;totalFood:number;time:number;x:number;y:number}
export const emptyInventory=()=>Object.fromEntries(Object.keys(PARTS).map(k=>[k,0])) as Record<PartKind,number>;
export function newRun():Run{return {scale:0,parts:Array.from({length:ORGAN_SLOTS},(_,i)=>i===0?'gather':i===4?'flagellum':null),angles:[...DEFAULT_ANGLES],shape:0,color:0xd9b45c,profile:profileFor(0),eyes:{...DEFAULT_EYES},pattern:'mottled',inventory:emptyInventory(),points:0,health:100,food:0,finalFood:0,totalFood:0,time:0,x:4400,y:4900};}
export const copyRun=(run:Run):Run=>structuredClone(run);
export const radius=(scale:number)=>22*BALANCE.scales[scale].size;
export const maxHealth=(scale:number,profile?:BodyProfile)=>Math.round((BALANCE.baseHealth+scale*32)*(profile?Math.max(.8,Math.min(1.35,1+.22*(profileMass(profile)-1))):1));
export const capacity=(scale:number)=>BALANCE.scales[scale].capacity;
export const usedCapacity=(parts:Parts)=>parts.filter(Boolean).length;
export const angleDiff=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export const normalizeAngle=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
/** Central snap zones; every other location represents a bilateral set. */
export function placementAngles(angle:number){const a=Math.abs(normalizeAngle(angle));if(a<.18)return [0];if(Math.PI-a<.18)return [Math.PI];const side=Math.max(.31,Math.min(Math.PI-.31,a));return [side,-side];}
export function groupSlots(run:Pick<Run,'parts'|'angles'>,slot:number){if(!run.parts[slot])return [];const a=run.angles[slot];if(Math.abs(Math.sin(a))<1e-5)return [slot];const pair=run.parts.findIndex((p,i)=>i!==slot&&p===run.parts[slot]&&Math.abs(angleDiff(run.angles[i],-a))<1e-4);return pair>=0?[slot,pair]:[slot];}
export function isSymmetric(parts:Parts,angles:number[]){return parts.every((p,i)=>!p||Math.abs(Math.sin(angles[i]))<1e-5||parts.some((q,j)=>i!==j&&p===q&&Math.abs(angleDiff(angles[j],-angles[i]))<1e-4));}
export function closestPart(run:Pick<Run,'parts'|'angles'>,angle:number,except=-1,tolerance=.255){let slot=-1,best=tolerance;run.parts.forEach((p,i)=>{const d=Math.abs(angleDiff(run.angles[i],angle));if(p&&i!==except&&d<best){slot=i;best=d;}});return slot;}
export function buy(run:Run,part:PartKind){if(run.points<PARTS[part].cost)return false;run.points-=PARTS[part].cost;run.inventory[part]++;return true;}
export function remove(run:Run,slot:number){const p=run.parts[slot];if(!p)return false;for(const i of groupSlots(run,slot))run.parts[i]=null;run.inventory[p]++;return true;}
export function mount(run:Run,part:PartKind,angle:number,_legacyMirror?:boolean):{ok:boolean;message:string}{
  if(!Number.isFinite(angle))return {ok:false,message:'Posición inválida.'};
  const next=copyRun(run),targets=placementAngles(angle),oldGroups=new Set<number>();
  for(const a of targets){const slot=closestPart(next,a);if(slot>=0)oldGroups.add(Math.min(...groupSlots(next,slot)));}
  for(const slot of oldGroups)remove(next,slot);
  if(usedCapacity(next.parts)+targets.length>capacity(next.scale))return {ok:false,message:'Capacidad completa. Retira una adaptación o reemplaza una existente.'};
  if(next.inventory[part]===0&&!buy(next,part))return {ok:false,message:'No tienes suficientes ADN para esta adaptación.'};
  next.inventory[part]--;
  for(const a of targets){const slot=next.parts.indexOf(null);if(slot<0)return {ok:false,message:'No queda espacio en la membrana.'};next.parts[slot]=part;next.angles[slot]=a;}
  Object.assign(run,next);return {ok:true,message:targets.length===2?'Par simétrico integrado. Un conjunto, dos órganos.':'Adaptación central integrada.'};
}
export function relocate(run:Run,slot:number,angle:number,_legacyMirror?:boolean){if(!run.parts[slot]||!Number.isFinite(angle))return false;const next=copyRun(run),part=next.parts[slot]!;remove(next,slot);const result=mount(next,part,angle);if(!result.ok)return false;Object.assign(run,next);return true;}
export function setProfile(run:Run,profile:BodyProfile){const fraction=run.health/maxHealth(run.scale,run.profile);run.profile=structuredClone(profile);run.health=Math.min(maxHealth(run.scale,profile),fraction*maxHealth(run.scale,profile));}
export function stats(parts:Parts,scale:number,angles?:number[],profile?:BodyProfile){
  const flags=propulsion(parts,angles),jets=parts.filter(p=>p==='jet').length,cilia=parts.filter(p=>p==='cilia').length;
  const weight=parts.reduce((n,p)=>n+(p?PARTS[p].weight:0),0),mass=profile?profileMass(profile):1,drag=1+Math.max(-.08,Math.min(.32,(mass-1)*.16));
  return {speed:BALANCE.baseSpeed*BALANCE.scales[scale].size*(1+.25*Math.sqrt(flags))/(1+weight)/drag,propulsion:flags,turnRate:Math.max(3.2,(5.8+1.4*Math.sqrt(turningPropulsion(parts,angles)))/(1+weight*.6)),acceleration:BALANCE.acceleration+1.5*Math.sqrt(cilia),health:maxHealth(scale,profile),cooldown:Math.max(1.2,BALANCE.dashCooldown-.35*Math.sqrt(flags)-.55*Math.sqrt(jets)),dashDuration:BALANCE.dashDuration+.11*Math.sqrt(jets),dashPower:2.3+.55*Math.sqrt(flags)+.55*Math.sqrt(jets),capacity:capacity(scale),mass};
}
export function partPosition(x:number,y:number,angle:number,r:number,slot:number,angles?:number[],shape?:number,profile?:BodyProfile){const local=localAngle(slot,angles),a=angle+local,pos=shape===undefined&&!profile?{x:Math.cos(local)*r*1.06,y:Math.sin(local)*r*1.06}:anchor(local,r,shape,profile);return {x:x+Math.cos(angle)*pos.x-Math.sin(angle)*pos.y,y:y+Math.sin(angle)*pos.x+Math.cos(angle)*pos.y,angle:a};}
export function compatible(part:PartKind,food:FoodKind){return part==='gather'&&food==='algae'||part==='jaw'&&food==='remains'||part==='filter'&&food==='particle';}
export function mouthAt(parts:Parts,x:number,y:number,angle:number,r:number,food:{x:number;y:number;kind:FoodKind;radius:number},angles?:number[],shape?:number,profile?:BodyProfile){return parts.some((p,i)=>{if(!p||!compatible(p,food.kind))return false;const pos=partPosition(x,y,angle,r,i,angles,shape,profile);return Math.hypot(pos.x-food.x,pos.y-food.y)<=food.radius+r*(p==='filter'?1.05:.4);});}
export function protection(parts:Parts,angle:number,incomingAngle:number,angles?:number[]){return parts.some((p,i)=>p==='plate'&&Math.abs(angleDiff(incomingAngle,angle+localAngle(i,angles)))<=Math.PI/7)?1-BALANCE.armorReduction:1;}
export function attackAt(parts:Parts,x:number,y:number,angle:number,r:number,target:{x:number;y:number;radius:number},angles?:number[],shape?:number,profile?:BodyProfile){let damage=0;parts.forEach((p,i)=>{if(p!=='jaw'&&p!=='spike')return;const pos=partPosition(x,y,angle,r*(p==='spike'?1.15:1),i,angles,shape,profile);if(Math.hypot(pos.x-target.x,pos.y-target.y)<target.radius+r*.35)damage=Math.max(damage,p==='jaw'?BALANCE.attackDamage:BALANCE.spikeDamage);});return damage;}
export function organContacts(parts:Parts,part:PartKind,x:number,y:number,angle:number,r:number,target:{x:number;y:number;radius:number},angles?:number[],shape?:number,profile?:BodyProfile){return parts.some((p,i)=>{if(p!==part)return false;const pos=partPosition(x,y,angle,r,i,angles,shape,profile);return Math.hypot(pos.x-target.x,pos.y-target.y)<target.radius+r*.5;});}
export function eat(run:Run,kind:FoodKind){const value=kind==='algae'?4:kind==='remains'?8:1;run.totalFood+=value;run.food+=value;run.health=Math.min(maxHealth(run.scale,run.profile),run.health+value*BALANCE.healPerFood);if(run.scale===4&&Math.hypot(run.x-BALANCE.finalZone.x,run.y-BALANCE.finalZone.y)<BALANCE.finalZone.radius)run.finalFood+=value;return value;}
export const canGrow=(run:Run)=>run.scale<4&&run.food>=BALANCE.scales[run.scale].food;
export function grow(run:Run){if(!canGrow(run))return false;run.scale++;run.food=0;run.points+=BALANCE.scales[run.scale].points;run.health=maxHealth(run.scale,run.profile);return true;}
export const canWin=(run:Run)=>run.scale===4&&run.finalFood>=BALANCE.finalFood;
