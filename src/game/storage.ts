import { DEFAULT_ANGLES, PALETTES } from './anatomy';
import { BALANCE, PARTS, type PartKind } from './config';
import { maxHealth, usedCapacity, capacity, type Run } from './model';
const KEY='sprout.save.v1', SETTINGS='sprout.settings.v1', BEST='sprout.best.v1';
export interface Settings { muted:boolean }
function read(key:string):unknown {try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
function write(key:string,value:unknown) {try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
export function validRun(value:unknown):value is Run {
  if(!value || typeof value!=='object') return false;
  const r=value as Run;
  if(!Number.isInteger(r.scale)||r.scale<0||r.scale>=BALANCE.scales.length) return false;
  if(!Array.isArray(r.parts)||r.parts.length!==8||r.parts.some(p=>p!==null && !Object.hasOwn(PARTS,p))||usedCapacity(r.parts)>capacity(r.scale)) return false;
  if(!Array.isArray(r.angles)||r.angles.length!==8||r.angles.some(a=>!Number.isFinite(a))||!Number.isInteger(r.shape)||r.shape<0||r.shape>3||!PALETTES.some(p=>p.color===r.color))return false;
  if(!r.parts.some(p=>p==='gather'||p==='jaw'||p==='filter')) return false;
  if(!r.inventory || Object.keys(PARTS).some(p=>!Number.isInteger(r.inventory[p as PartKind])||r.inventory[p as PartKind]<0||r.inventory[p as PartKind]>1000)) return false;
  if(!['health','food','finalFood','totalFood','time','points','x','y'].every(k=>typeof r[k as keyof Run]==='number' && Number.isFinite(r[k as keyof Run]) && Number(r[k as keyof Run])>=0)) return false;
  return r.health>0&&r.health<=maxHealth(r.scale)&&r.x<=BALANCE.world&&r.y<=BALANCE.world&&Number.isInteger(r.points)&&r.points<=1000;
}
export function loadRun():Run|null {
  const s=read(KEY) as {version?:number;run?:unknown}|null;
  if(!s||(s.version!==1&&s.version!==2)||!s.run||typeof s.run!=='object')return null;
  const r=structuredClone(s.run) as Run;
  if(s.version===1){r.angles??=[...DEFAULT_ANGLES];r.shape??=0;r.color??=0x66cab1;}
  return validRun(r)?r:null;
}
export function saveRun(run:Run) {return write(KEY,{version:2,run});}
export function clearRun() {try{localStorage.removeItem(KEY);}catch{/* Storage may be blocked. */}}
export function loadSettings():Settings {const s=read(SETTINGS) as Settings|null;return {muted:typeof s?.muted==='boolean'?s.muted:false};}
export function saveSettings(settings:Settings){write(SETTINGS,settings);}
export interface Best { won:boolean;scale:number;food:number;time:number }
export function loadBest():Best|null {const b=read(BEST) as Best|null;return b&&typeof b.won==='boolean'&&Number.isInteger(b.scale)&&b.scale>=0&&b.scale<=4&&Number.isFinite(b.food)&&b.food>=0&&Number.isFinite(b.time)&&b.time>=0?b:null;}
export function recordResult(run:Run,won:boolean){const old=loadBest();if(!old||(won&&!old.won)||(won===old.won&&(run.scale>old.scale||(run.scale===old.scale&&run.totalFood>old.food)))) write(BEST,{won,scale:run.scale,food:run.totalFood,time:run.time});}
