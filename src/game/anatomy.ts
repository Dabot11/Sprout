import type { Parts } from './config';
export const ORGAN_SLOTS=16;
export const DEFAULT_ANGLES=Array.from({length:ORGAN_SLOTS},(_,i)=>i<8?i*Math.PI/4:(i-8)*Math.PI/4+Math.PI/8);
export interface BodyProfile {length:number;knots:number[];widths:number[]}
export type SkinPattern='mottled'|'bands'|'plain'|'granules';
export type EyeKind='orb'|'stalk'|'compound';
export interface Eyes {kind:EyeKind;pairs:number;position:number;spacing:number}
export const EYES:Record<EyeKind,{name:string;description:string}>={orb:{name:'Órbita',description:'Ojos grandes de iris profundo.'},stalk:{name:'Pedúnculo',description:'Ojos sobre tallos curvos y móviles.'},compound:{name:'Mosaico',description:'Una corona de pequeñas lentes.'}};
export const DEFAULT_EYES:Eyes={kind:'orb',pairs:1,position:.43,spacing:.76};
export const FORMS=[{name:'Gota',rx:1.2,ry:.85},{name:'Vesícula',rx:1,ry:1},{name:'Nadadora',rx:1.5,ry:.65},{name:'Lobulada',rx:1.25,ry:.95}];
export const PALETTES=[{name:'Jade',color:0x66aa85},{name:'Lima',color:0x9dbb42},{name:'Coral',color:0xd7797d},{name:'Ámbar',color:0xd9b45c},{name:'Lila',color:0x9980c4},{name:'Nácar',color:0x85b6c3}];
export const PATTERNS:Record<SkinPattern,string>={mottled:'Manchas',bands:'Bandas',plain:'Lisa',granules:'Granulada'};
export function profileFor(shape=0):BodyProfile{
  const presets=[{length:2.45,widths:[.32,.76,1,.81,.34]},{length:2.05,widths:[.48,.88,1,.88,.48]},{length:3.15,widths:[.23,.51,.69,.63,.3]},{length:2.7,widths:[.4,.86,.7,1,.38]}];
  return {...presets[shape%4],widths:[...presets[shape%4].widths],knots:[-.8,-.4,0,.4,.8]};
}
export function validProfile(p:unknown):p is BodyProfile{
  if(!p||typeof p!=='object')return false;const b=p as BodyProfile;
  return Number.isFinite(b.length)&&b.length>=1.4&&b.length<=3.6&&Array.isArray(b.widths)&&b.widths.length===5&&b.widths.every(w=>Number.isFinite(w)&&w>=.18&&w<=1.3)&&Array.isArray(b.knots)&&b.knots.length===5&&b.knots.every((k,i)=>Number.isFinite(k)&&k>=-.9&&k<=.9&&(i===0||k-b.knots[i-1]>=.1-1e-6));
}
export function validEyes(e:unknown):e is Eyes{if(!e||typeof e!=='object')return false;const eye=e as Eyes;return Object.hasOwn(EYES,eye.kind)&&Number.isInteger(eye.pairs)&&eye.pairs>=1&&eye.pairs<=3&&Number.isFinite(eye.position)&&Math.abs(eye.position)<=.7&&Number.isFinite(eye.spacing)&&eye.spacing>=.55&&eye.spacing<=1.15;}
export function widthAt(x:number,p:BodyProfile){
  const u=x/(p.length/2);if(Math.abs(u)>=1)return 0;
  const k=p.knots,w=p.widths;
  if(u<k[0]){const t=(u+1)/(k[0]+1);return w[0]*Math.sqrt(Math.max(0,1-(1-t)**2));}
  if(u>k[4]){const t=(1-u)/(1-k[4]);return w[4]*Math.sqrt(Math.max(0,1-(1-t)**2));}
  let i=0;while(i<3&&u>k[i+1])i++;
  const t=(u-k[i])/(k[i+1]-k[i]),smooth=t*t*(3-2*t);return w[i]+(w[i+1]-w[i])*smooth;
}
export function profileMass(p:BodyProfile){return p.length*p.widths.reduce((n,w)=>n+w,0)/(2.45*(.32+.76+1+.81+.34));}
export function localAngle(slot:number,angles?:number[]){return angles?.[slot]??DEFAULT_ANGLES[slot]??0;}
export function bodyRadius(angle:number,shape=0,profile?:BodyProfile){
  if(profile){const c=Math.cos(angle),s=Math.abs(Math.sin(angle)),extent=Math.min(profile.length/2/(Math.abs(c)||1e-9),Math.max(...profile.widths)/(s||1e-9))*1.001;
    // A sculpted neck can cross a ray more than once. Search from the outside,
    // then refine the outer membrane instead of assuming a convex body.
    let hi=extent,lo=0;for(let i=1;i<=64;i++){const d=extent*(1-i/64);if(d*s<=widthAt(d*c,profile)){lo=d;break;}hi=d;}
    for(let i=0;i<15;i++){const mid=(lo+hi)/2;if(mid*s<=widthAt(mid*c,profile))lo=mid;else hi=mid;}return (lo+hi)/2;}
  const form=FORMS[shape%4],c=Math.cos(angle),s=Math.sin(angle);return 1/Math.sqrt((c/form.rx)**2+(s/form.ry)**2)*(1+.025*Math.cos(3*angle));
}
export function anchor(angle:number,r:number,shape=0,profile?:BodyProfile){const distance=bodyRadius(angle,shape,profile)*r*.97;return {x:Math.cos(angle)*distance,y:Math.sin(angle)*distance};}
export function propulsion(parts:Parts,angles?:number[]){return parts.reduce((sum,p,i)=>sum+(p==='flagellum'?.35+.65*(1-Math.cos(localAngle(i,angles)))/2:p==='cilia'?.24:0),0);}
export function turningPropulsion(parts:Parts,angles?:number[]){return parts.reduce((sum,p,i)=>sum+(p==='flagellum'?.35+.65*Math.abs(Math.sin(localAngle(i,angles))):p==='cilia'?1.4:0),0);}
export function tailPoints(a:number,r:number,shape:number,time:number,movement:number,phase:number,profile?:BodyProfile){
  const root=anchor(a,r,shape,profile),speed=Math.min(1.7,movement),result:{x:number;y:number;width:number}[]=[];
  for(let i=0;i<=26;i++){const u=i/26,wave=Math.sin(time*(2.3+speed*7)-u*7+phase)*r*(.04+speed*.18)*u;result.push({x:root.x+Math.cos(a)*r*1.5*u-Math.sin(a)*wave,y:root.y+Math.sin(a)*r*1.5*u+Math.cos(a)*wave,width:r*(.1*(1-u)**1.15+.009)});}return result;
}
export function eyeAnchors(eyes:Eyes,p:BodyProfile,r:number){
  const out:{x:number;y:number;side:number}[]=[];for(let i=0;i<eyes.pairs;i++){const u=Math.max(-.78,Math.min(.78,eyes.position+(i-(eyes.pairs-1)/2)*.35)),x=u*p.length/2;
    for(const side of [-1,1])out.push({x:x*r,y:side*widthAt(x,p)*r*eyes.spacing,side});}return out;
}
export function editorRadius(profile:BodyProfile,withOrgans=true){return Math.min(106,218/(profile.length/2+(withOrgans?1.55:.15)));}
