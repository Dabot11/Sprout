import { anchor, DEFAULT_ANGLES, localAngle, propulsion, turningPropulsion } from './anatomy';
import { BALANCE, PARTS, type Parts, type PartKind, type FoodKind } from './config';
export interface Run {
  scale: number; parts: Parts; angles:number[]; shape:number; color:number; inventory: Record<PartKind, number>; points: number;
  health: number; food: number; finalFood: number; totalFood: number; time: number; x: number; y: number;
}
export const emptyInventory = (): Record<PartKind,number> => ({gather:0,jaw:0,filter:0,spike:0,flagellum:0,plate:0});
export function newRun(): Run {
  return { scale:0,angles:[...DEFAULT_ANGLES],shape:0,color:0x66cab1,parts:['gather',null,null,null,'flagellum',null,null,null],inventory:emptyInventory(),points:0,health:100,food:0,finalFood:0,totalFood:0,time:0,x:4400,y:4900 };
}
export const copyRun = (run: Run): Run => structuredClone(run);
export const radius = (scale: number) => 22 * BALANCE.scales[scale].size;
export const maxHealth = (scale: number) => BALANCE.baseHealth + scale * 32;
export const capacity = (scale: number) => BALANCE.scales[scale].capacity;
export const usedCapacity = (parts: Parts) => parts.filter(Boolean).length;
export const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function partPosition(x:number,y:number,angle:number,r:number,slot:number,angles?:number[],shape?:number) {
  const local=localAngle(slot,angles),a=angle+local;
  const pos=shape===undefined?{x:Math.cos(local)*r*1.06,y:Math.sin(local)*r*1.06}:anchor(local,r,shape);
  return {x:x+Math.cos(angle)*pos.x-Math.sin(angle)*pos.y,y:y+Math.sin(angle)*pos.x+Math.cos(angle)*pos.y,angle:a};
}
export function stats(parts: Parts, scale: number,angles?:number[]) {
  const flags=propulsion(parts,angles);
  const weight=parts.reduce((n,p)=>n+(p?PARTS[p].weight:0),0);
  return { speed:BALANCE.baseSpeed*BALANCE.scales[scale].size*(1+.25*Math.sqrt(flags))/(1+weight),
    propulsion:flags, turnRate:Math.max(4,(5.8+1.4*Math.sqrt(turningPropulsion(parts,angles)))/(1+weight*.6)), health:maxHealth(scale), cooldown:Math.max(1.8,BALANCE.dashCooldown-.35*Math.sqrt(flags)), capacity:capacity(scale) };
}
export function compatible(part: PartKind, food: FoodKind) {
  return (part==='gather' && food==='algae') || (part==='jaw' && food==='remains') || (part==='filter' && food==='particle');
}
export function mouthAt(parts:Parts,x:number,y:number,angle:number,r:number,food:{x:number;y:number;kind:FoodKind;radius:number},angles?:number[],shape?:number) {
  return parts.some((p,i)=> {
    if(!p || !compatible(p,food.kind)) return false;
    const pos=partPosition(x,y,angle,r,i,angles,shape);
    return Math.hypot(pos.x-food.x,pos.y-food.y) <= food.radius+r*(p==='filter'?1.05:.4);
  });
}
export function protection(parts:Parts,angle:number,incomingAngle:number,angles?:number[]) {
  return parts.some((p,i)=>p==='plate' && Math.abs(angleDiff(incomingAngle,angle+localAngle(i,angles)))<=Math.PI/7)?1-BALANCE.armorReduction:1;
}
export function attackAt(parts:Parts,x:number,y:number,angle:number,r:number,target:{x:number;y:number;radius:number},angles?:number[],shape?:number) {
  let damage=0;
  parts.forEach((p,i)=> {
    if(p!=='jaw'&&p!=='spike') return;
    const pos=partPosition(x,y,angle,r*(p==='spike'?1.15:1),i,angles,shape);
    if(Math.hypot(pos.x-target.x,pos.y-target.y) < target.radius+r*.35)
      damage=Math.max(damage,p==='jaw'?BALANCE.attackDamage:BALANCE.spikeDamage);
  });
  return damage;
}
export function buy(run:Run,part:PartKind):boolean {
  if(run.points<PARTS[part].cost) return false;
  run.points-=PARTS[part].cost;run.inventory[part]++;return true;
}
export function place(run:Run,part:PartKind,slot:number):boolean {
  if(slot<0||slot>7||run.inventory[part]<1 || (run.parts[slot]===null && usedCapacity(run.parts)>=capacity(run.scale))) return false;
  const previous=run.parts[slot];if(previous) run.inventory[previous]++;
  run.inventory[part]--;run.parts[slot]=part;return true;
}
export function move(run:Run,from:number,to:number):boolean {
  if(from<0||from>7||to<0||to>7||!run.parts[from]) return false;
  [run.parts[from],run.parts[to]]=[run.parts[to],run.parts[from]];return true;
}
export function remove(run:Run,slot:number):boolean {
  const p=run.parts[slot];if(!p) return false;
  run.inventory[p]++;run.parts[slot]=null;return true;
}
export function eat(run:Run,kind:FoodKind):number {
  const value=kind==='algae'?4:kind==='remains'?8:1;
  run.totalFood+=value;run.food+=value;run.health=Math.min(maxHealth(run.scale),run.health+value*BALANCE.healPerFood);
  if(run.scale===4 && Math.hypot(run.x-BALANCE.finalZone.x,run.y-BALANCE.finalZone.y)<BALANCE.finalZone.radius) run.finalFood+=value;
  return value;
}
export function canGrow(run:Run) { return run.scale<4 && run.food>=BALANCE.scales[run.scale].food; }
export function grow(run:Run):boolean {
  if(!canGrow(run)) return false;
  run.scale++;run.food=0;run.points+=BALANCE.scales[run.scale].points;run.health=maxHealth(run.scale);return true;
}
export function canWin(run:Run) {return run.scale===4 && run.finalFood>=BALANCE.finalFood;}
export const normalizeAngle=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
export function closestPart(run:Run,angle:number,except=-1,tolerance=.34){
  let slot=-1,best=tolerance;
  run.parts.forEach((p,i)=>{const distance=Math.abs(angleDiff(run.angles[i],angle));if(p&&i!==except&&distance<best){slot=i;best=distance;}});return slot;
}
/** Purchase and mount atomically: rejected placement never consumes inventory or points. */
export function mount(run:Run,part:PartKind,angle:number,mirror=false):{ok:boolean;message:string}{
  if(!Number.isFinite(angle))return {ok:false,message:'Posición inválida.'};
  const next=copyRun(run),angles=[normalizeAngle(angle)];
  if(mirror&&Math.abs(angleDiff(angle,-angle))>.34)angles.push(normalizeAngle(-angle));
  for(const a of angles){
    let slot=closestPart(next,a);if(slot<0){if(usedCapacity(next.parts)>=capacity(next.scale))return {ok:false,message:'Capacidad completa. Retira una pieza o colócala sobre otra para reemplazarla.'};slot=next.parts.indexOf(null);}
    if(slot<0)return {ok:false,message:'No queda espacio en la membrana.'};
    const replaced=next.parts[slot];if(replaced){next.inventory[replaced]++;next.parts[slot]=null;}
    if(next.inventory[part]===0&&!buy(next,part))return {ok:false,message:mirror?'No tienes puntos o piezas suficientes para el par.':'No tienes suficientes puntos para esta adaptación.'};
    if(!place(next,part,slot))return {ok:false,message:'No se pudo colocar la pieza.'};next.angles[slot]=a;
  }
  Object.assign(run,next);return {ok:true,message:angles.length===2?'Par simétrico integrado.':'Pieza integrada en la membrana.'};
}
export function relocate(run:Run,slot:number,angle:number,mirror=false):boolean{
  if(!run.parts[slot]||!Number.isFinite(angle))return false;
  const oldAngle=run.angles[slot];let a=normalizeAngle(angle);
  const sibling=mirror?run.parts.findIndex((p,i)=>i!==slot&&p===run.parts[slot]&&Math.abs(angleDiff(run.angles[i],-oldAngle))<.1):-1;
  // A mirrored pair keeps clearance when dragged onto the front or rear centerline.
  if(sibling>=0&&Math.abs(angleDiff(a,-a))<.44){const sign=Math.sin(oldAngle)>=0?1:-1;a=sign*(Math.cos(a)>=0?.22:Math.PI-.22);}
  const next=copyRun(run),sources=sibling>=0?[slot,sibling]:[slot],targets=sibling>=0?[a,normalizeAngle(-a)]:[a];
  sources.forEach((source,j)=>{
    let target=-1,best=.34;
    next.parts.forEach((p,i)=>{const d=Math.abs(angleDiff(next.angles[i],targets[j]));if(p&&!sources.includes(i)&&d<best){target=i;best=d;}});
    if(target>=0)next.angles[target]=run.angles[source];next.angles[source]=targets[j];
  });run.angles=next.angles;return true;
}
