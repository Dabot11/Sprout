import { DEFAULT_ANGLES, DEFAULT_EYES, ORGAN_SLOTS, PATTERNS, profileFor, validEyes, validProfile } from './anatomy';
import { BALANCE, PARTS, type PartKind } from './config';
import { maxHealth, usedCapacity, capacity, isSymmetric, mount, newRun, emptyInventory, type Run } from './model';
const KEY='sprout.save.v1',SETTINGS='sprout.settings.v1',BEST='sprout.best.v1';
export interface Settings{muted:boolean}
function read(key:string):unknown{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
function write(key:string,value:unknown){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
export function validRun(value:unknown):value is Run{
  if(!value||typeof value!=='object')return false;const r=value as Run;
  if(!Number.isInteger(r.scale)||r.scale<0||r.scale>=BALANCE.scales.length)return false;
  if(!Array.isArray(r.parts)||r.parts.length!==ORGAN_SLOTS||r.parts.some(p=>p!==null&&!Object.hasOwn(PARTS,p))||usedCapacity(r.parts)>capacity(r.scale))return false;
  if(!Array.isArray(r.angles)||r.angles.length!==ORGAN_SLOTS||r.angles.some(a=>!Number.isFinite(a))||!isSymmetric(r.parts,r.angles))return false;
  if(r.parts.some((p,i)=>p&&r.parts.some((q,j)=>q&&j>i&&Math.abs(Math.atan2(Math.sin(r.angles[i]-r.angles[j]),Math.cos(r.angles[i]-r.angles[j])))<1e-4)))return false;
  if(!Number.isInteger(r.shape)||r.shape<0||r.shape>3||!Number.isInteger(r.color)||r.color<0||r.color>0xffffff||!validProfile(r.profile)||!validEyes(r.eyes)||!Object.hasOwn(PATTERNS,r.pattern))return false;
  if(!r.parts.some(p=>p==='gather'||p==='jaw'||p==='filter'))return false;
  if(!r.inventory||Object.keys(PARTS).some(p=>!Number.isInteger(r.inventory[p as PartKind])||r.inventory[p as PartKind]<0||r.inventory[p as PartKind]>1000))return false;
  if(!['health','food','finalFood','totalFood','time','points','x','y'].every(k=>typeof r[k as keyof Run]==='number'&&Number.isFinite(r[k as keyof Run])&&Number(r[k as keyof Run])>=0))return false;
  return r.health>0&&r.health<=maxHealth(r.scale,r.profile)+.001&&r.x<=BALANCE.world&&r.y<=BALANCE.world&&Number.isInteger(r.points)&&r.points<=1000;
}
export function migrateRun(value:unknown):Run|null{
  if(!value||typeof value!=='object')return null;const old=value as Run;
  if(!Array.isArray(old.parts)||old.parts.length!==8||old.parts.some(p=>p!==null&&!Object.hasOwn(PARTS,p))||!Number.isInteger(old.scale)||old.scale<0||old.scale>4)return null;
  if(old.angles!==undefined&&(!Array.isArray(old.angles)||old.angles.length!==8||old.angles.some(a=>!Number.isFinite(a))))return null;
  if(old.shape!==undefined&&(!Number.isInteger(old.shape)||old.shape<0||old.shape>3))return null;
  if(!old.inventory||Object.entries(old.inventory).some(([k,v])=>!Object.hasOwn(PARTS,k)||!Number.isInteger(v)||v<0||v>1000))return null;
  const r={...newRun(),...structuredClone(old),parts:Array(ORGAN_SLOTS).fill(null),angles:[...DEFAULT_ANGLES],profile:profileFor(old.shape??0),eyes:{...DEFAULT_EYES},pattern:'mottled' as const,inventory:{...emptyInventory(),...old.inventory},shape:old.shape??0,color:old.color??0xd9b45c};
  const visited=new Set<number>(),savedPoints=r.points;
  const order=old.parts.map((p,i)=>({p,i})).filter(x=>x.p).sort((a,b)=>Number(PARTS[a.p!].category!=='mouth')-Number(PARTS[b.p!].category!=='mouth'));
  for(const {p,i}of order){if(!p||visited.has(i))continue;const a=old.angles?.[i]??DEFAULT_ANGLES[i];visited.add(i);
    const pair=old.parts.findIndex((q,j)=>j!==i&&!visited.has(j)&&q===p&&Math.abs(Math.atan2(Math.sin((old.angles?.[j]??DEFAULT_ANGLES[j])+a),Math.cos((old.angles?.[j]??DEFAULT_ANGLES[j])+a)))<.001);if(pair>=0)visited.add(pair);
    r.inventory[p]++;const result=mount(r,p,a);if(!result.ok){/* The module remains in reserve when the new body is full. */}
  }
  r.points=savedPoints;r.health=Math.min(maxHealth(r.scale,r.profile),old.health/(100+old.scale*32)*maxHealth(r.scale,r.profile));return validRun(r)?r:null;
}
export function loadRun(){const s=read(KEY) as {version?:number;run?:unknown}|null;if(!s)return null;if(s.version===3)return validRun(s.run)?s.run:null;if(s.version===1||s.version===2)return migrateRun(s.run);return null;}
export const saveRun=(run:Run)=>write(KEY,{version:3,run});
export function clearRun(){try{localStorage.removeItem(KEY);}catch{/* Browser storage can be disabled. */}}
export function loadSettings():Settings{const s=read(SETTINGS) as Settings|null;return {muted:typeof s?.muted==='boolean'?s.muted:false};}
export const saveSettings=(settings:Settings)=>write(SETTINGS,settings);
export interface Best{won:boolean;scale:number;food:number;time:number}
export function loadBest():Best|null{const b=read(BEST) as Best|null;return b&&typeof b.won==='boolean'&&Number.isInteger(b.scale)&&b.scale>=0&&b.scale<=4&&Number.isFinite(b.food)&&b.food>=0&&Number.isFinite(b.time)&&b.time>=0?b:null;}
export function recordResult(run:Run,won:boolean){const old=loadBest();if(!old||(won&&!old.won)||(won===old.won&&(run.scale>old.scale||(run.scale===old.scale&&run.totalFood>old.food))))write(BEST,{won,scale:run.scale,food:run.totalFood,time:run.time});}
